import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useUserManagementData() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    try {
      setUsers([]);
      setLoading(true);
      setError(null);

      const { data: { user }, error: fetchError } = await supabase.auth.getUser();

      if (fetchError) throw fetchError;

      if (user) {
        setUsers([{
          id: user.id,
          name: user.user_metadata?.full_name || 'Current User',
          email: user.email,
          role: user.user_metadata?.role || 'User',
          status: 'Active',
          last_login: user.last_sign_in_at || user.created_at
        }]);

        console.log(`DATA ==> ${user}`);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const addUser = async (email, password, metadata = {}) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });
      if (error) throw error;

      await fetchUsers();
      console.log(`USER: ${JSON.string(data)}`);
      return { success: true, data };
    } catch (err) {
      console.error('Error adding user:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (email, password, metadata) => {
    try {
      setLoading(true);
      const updateData = {};
      if (email) updateData.email = email;
      if (password) updateData.password = password;
      if (metadata) updateData.data = metadata;

      const { data, error } = await supabase.auth.updateUser(updateData);

      if (error) throw error;

      await fetchUsers();
      return { success: true, data };
    } catch (err) {
      console.error('Error updating user:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email, newPassword) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      return { success: true, data };
    } catch (err) {
      console.error('Error resetting password:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    users,
    loading,
    error,
    fetchUsers,
    addUser,
    updateUser,
    resetPassword,
  };
}
