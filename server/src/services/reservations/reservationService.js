/**
 * Reservation & Table Booking Service
 * Manages restaurant reservations, table allocations, and related workflows
 */

import Reservation from '../../models/Reservation.js';
import Table from '../../models/Table.js';
import emailService from '../notifications/emailService.js';
import smsService from '../notifications/smsService.js';

class ReservationService {
  /**
   * Create new reservation
   */
  async createReservation(branchId, reservationData) {
    // Validate table availability
    const table = await this.findAvailableTable(branchId, reservationData);
    if (!table) {
      throw new Error('No available tables for the selected date and time');
    }

    // Generate confirmation code
    const confirmationCode = this.generateConfirmationCode();

    // Create reservation
    const reservation = await Reservation.create({
      branch: branchId,
      table: table._id,
      ...reservationData,
      confirmationCode,
      status: 'confirmed',
    });

    // Send confirmation to customer
    await this.sendReservationConfirmation(reservation);

    return reservation;
  }

  /**
   * Find available table for reservation
   */
  async findAvailableTable(branchId, reservationData) {
    const { guestCount, reservationDate, reservationTime, duration = 120 } = reservationData;

    // Parse reservation time
    const [hours, minutes] = reservationTime.split(':').map(Number);
    const reservationStart = new Date(reservationDate);
    reservationStart.setHours(hours, minutes, 0, 0);
    const reservationEnd = new Date(reservationStart.getTime() + duration * 60000);

    // Get all tables that can fit guest count
    const suitableTables = await Table.find({
      branch: branchId,
      capacity: { $gte: guestCount },
      available: true,
    });

    // Check for conflicts
    for (const table of suitableTables) {
      const conflict = await Reservation.findOne({
        table: table._id,
        status: { $in: ['confirmed', 'seated'] },
        $or: [
          {
            reservationDate: {
              $lte: reservationEnd,
              $gte: reservationStart,
            },
          },
          {
            seatedTime: { $exists: true },
            completedTime: { $exists: false },
          },
        ],
      });

      if (!conflict) {
        return table;
      }
    }

    return null;
  }

  /**
   * Get available time slots
   */
  async getAvailableTimeSlots(branchId, guestCount, reservationDate) {
    const timeSlots = [];
    const slotDuration = 120; // 2 hours per reservation

    // Business hours: 11:00 to 23:00
    for (let hour = 11; hour < 23; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

        const available = await this.findAvailableTable(branchId, {
          guestCount,
          reservationDate,
          reservationTime: timeStr,
          duration: slotDuration,
        });

        if (available) {
          timeSlots.push({
            time: timeStr,
            available: true,
            table: available.name,
          });
        }
      }
    }

    return timeSlots;
  }

  /**
   * Confirm reservation (customer confirms via email link)
   */
  async confirmReservation(confirmationCode) {
    const reservation = await Reservation.findOne({ confirmationCode });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (reservation.status !== 'pending') {
      throw new Error('Reservation already confirmed or cancelled');
    }

    reservation.status = 'confirmed';
    await reservation.save();

    return reservation;
  }

  /**
   * Mark table as seated
   */
  async seatReservation(reservationId) {
    const reservation = await Reservation.findById(reservationId);

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (reservation.status !== 'confirmed') {
      throw new Error('Reservation must be confirmed before seating');
    }

    reservation.status = 'seated';
    reservation.seatedTime = new Date();
    await reservation.save();

    return reservation;
  }

  /**
   * Complete reservation
   */
  async completeReservation(reservationId, feedback = null) {
    const reservation = await Reservation.findById(reservationId);

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    reservation.status = 'completed';
    reservation.completedTime = new Date();

    if (feedback) {
      reservation.rating = feedback.rating;
      reservation.feedback = feedback.comment;
    }

    await reservation.save();

    // Process refund if applicable
    if (reservation.depositStatus === 'paid') {
      reservation.depositStatus = 'refunded';
      await reservation.save();
    }

    return reservation;
  }

  /**
   * Cancel reservation
   */
  async cancelReservation(reservationId, reason, cancelledBy = 'customer') {
    const reservation = await Reservation.findById(reservationId);

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (['completed', 'cancelled', 'no-show'].includes(reservation.status)) {
      throw new Error('Cannot cancel this reservation');
    }

    // Calculate refund if applicable (full refund if cancelled 24 hours before)
    const hoursUntilReservation = (new Date(reservation.reservationDate) - new Date()) / 1000 / 60 / 60;
    const refundPercentage = hoursUntilReservation >= 24 ? 100 : hoursUntilReservation >= 12 ? 50 : 0;

    reservation.status = 'cancelled';
    reservation.cancelReason = reason;
    reservation.cancelledBy = cancelledBy;

    if (reservation.depositStatus === 'paid' && refundPercentage > 0) {
      reservation.depositStatus = 'refunded';
    }

    await reservation.save();

    // Send cancellation confirmation
    await emailService.send(
      reservation.customerEmail,
      'Reservation Cancelled',
      `Your reservation for ${reservation.guestCount} guests on ${reservation.reservationDate} has been cancelled. Refund: ${refundPercentage}%`
    );

    return {
      reservation,
      refundAmount: (reservation.depositAmount * refundPercentage) / 100,
    };
  }

  /**
   * Mark as no-show
   */
  async markAsNoShow(reservationId) {
    const reservation = await Reservation.findById(reservationId);

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    reservation.status = 'no-show';
    await reservation.save();

    // No refund for no-show
    if (reservation.depositStatus === 'paid') {
      reservation.depositStatus = 'refunded'; // Optional policy
    }

    return reservation;
  }

  /**
   * Send reservation reminder (24 hours before)
   */
  async sendReservationReminders() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    const reservations = await Reservation.find({
      reservationDate: { $gte: tomorrow, $lte: endOfTomorrow },
      status: 'confirmed',
      reminderSentAt: { $exists: false },
    });

    for (const res of reservations) {
      try {
        if (res.notificationPreferences.email && res.customerEmail) {
          await emailService.send(
            res.customerEmail,
            'Reservation Reminder',
            `Your reservation for ${res.guestCount} guests is confirmed for tomorrow at ${res.reservationTime}`
          );
        }

        if (res.notificationPreferences.sms && res.customerPhone) {
          await smsService.send(
            res.customerPhone,
            `Reminder: Your reservation for ${res.guestCount} at ${res.reservationTime} tomorrow. Confirmation: ${res.confirmationCode}`
          );
        }

        res.reminderSentAt = new Date();
        await res.save();
      } catch (error) {
        console.error(`Failed to send reminder for reservation ${res._id}:`, error);
      }
    }

    return reservations.length;
  }

  /**
   * Get reservation by confirmation code
   */
  async getReservationByCode(confirmationCode) {
    return Reservation.findOne({ confirmationCode }).populate('table', 'name capacity');
  }

  /**
   * Get customer's reservations
   */
  async getCustomerReservations(customerPhone, branchId = null) {
    const query = { customerPhone };
    if (branchId) query.branch = branchId;

    return Reservation.find(query)
      .populate('table', 'name capacity')
      .sort({ reservationDate: -1 });
  }

  /**
   * Get today's reservations for branch
   */
  async getTodaysReservations(branchId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return Reservation.find({
      branch: branchId,
      reservationDate: { $gte: today, $lt: tomorrow },
    })
      .populate('table', 'name capacity')
      .sort({ reservationTime: 1 });
  }

  /**
   * Get reservation occupancy for date
   */
  async getOccupancyForDate(branchId, date) {
    const reservations = await Reservation.find({
      branch: branchId,
      reservationDate: {
        $gte: new Date(date),
        $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
      },
      status: { $in: ['confirmed', 'seated', 'completed'] },
    }).lean();

    const totalGuests = reservations.reduce((sum, r) => sum + r.guestCount, 0);
    const occupancyRate = await this.calculateOccupancyRate(branchId, date);

    return {
      date,
      totalReservations: reservations.length,
      totalGuests,
      avgGuestPerReservation: reservations.length > 0 ? totalGuests / reservations.length : 0,
      occupancyRate,
    };
  }

  /**
   * Calculate occupancy rate
   */
  async calculateOccupancyRate(branchId, date) {
    const tables = await Table.find({ branch: branchId, available: true }).lean();
    const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);

    if (totalCapacity === 0) return 0;

    const reservations = await Reservation.find({
      branch: branchId,
      reservationDate: {
        $gte: new Date(date),
        $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
      },
      status: { $in: ['confirmed', 'seated', 'completed'] },
    }).lean();

    const totalGuests = reservations.reduce((sum, r) => sum + r.guestCount, 0);

    return (totalGuests / totalCapacity) * 100;
  }

  /**
   * Send reservation confirmation email
   */
  async sendReservationConfirmation(reservation) {
    const table = await Table.findById(reservation.table).select('name capacity');

    const emailContent = `
      <h1>✓ Reservation Confirmed</h1>
      <h2>Confirmation Code: ${reservation.confirmationCode}</h2>
      <p><strong>Date:</strong> ${new Date(reservation.reservationDate).toLocaleDateString()}</p>
      <p><strong>Time:</strong> ${reservation.reservationTime}</p>
      <p><strong>Party Size:</strong> ${reservation.guestCount} guests</p>
      <p><strong>Table:</strong> ${table?.name || 'TBD'}</p>
      ${reservation.specialRequests.length > 0 ? `<p><strong>Special Requests:</strong> ${reservation.specialRequests.join(', ')}</p>` : ''}
      <p>Please arrive 5 minutes early. If you need to cancel or modify, use your confirmation code.</p>
    `;

    if (reservation.customerEmail) {
      await emailService.send(
        reservation.customerEmail,
        'Reservation Confirmation',
        emailContent
      );
    }

    if (reservation.customerPhone) {
      await smsService.send(
        reservation.customerPhone,
        `Reservation confirmed for ${new Date(reservation.reservationDate).toLocaleDateString()} at ${reservation.reservationTime}. Code: ${reservation.confirmationCode}`
      );
    }
  }

  /**
   * Generate unique confirmation code
   */
  generateConfirmationCode() {
    const code = 'RES-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    return code;
  }
}

export default new ReservationService();
