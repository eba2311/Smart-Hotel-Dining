import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export function useBranch() {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [branch, setBranchState] = useState(() => {
    const saved = localStorage.getItem('sh_branch');
    return saved || user?.branch || '';
  });

  useEffect(() => {
    adminApi.branches().then((res) => setBranches(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!branch && branches.length > 0) {
      const b = branches[0];
      localStorage.setItem('sh_branch', b._id);
      setBranchState(b._id);
    }
  }, [branches, branch]);

  const setBranch = useCallback((id) => {
    localStorage.setItem('sh_branch', id);
    setBranchState(id);
  }, []);

  return { branch, branches, setBranch };
}
