import { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  Shield,
  UserX,
  Search,
  Plus,
  RefreshCcw,
  Edit2,
  Key,
  X,
  Loader2,
  Trash2
} from "lucide-react";
import toast from "react-hot-toast";
import useAiSettingsData from "../hooks/useAiSettingsData";

export default function UserManagementScreen() {
  const { users, loading, fetchUsers, addUser, updateUser, resetPassword, deleteUser } = useAiSettingsData();



  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [helloData, setHelloData] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForms = () => {
    setEmail("");
    setPassword("");
    setHelloData("");
    setSelectedUser(null);
  };

  const handleDelete = async (user) => {
    if (!user) return;
    try {
      await deleteUser(user.id);
    } catch (err) {
      // error handling already done in hook
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addUser(email, password, { hello: helloData });
      toast.success("User added successfully");
      setShowAddModal(false);
      resetForms();
    } catch (err) {
      toast.error(err.message || "Failed to add user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await updateUser(selectedUser.id, email, password, { hello: helloData });
      toast.success("User updated successfully");
      setShowUpdateModal(false);
      resetForms();
    } catch (err) {
      toast.error(err.message || "Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await resetPassword(selectedUser.id, password);
      toast.success("Password reset successfully");
      setShowResetModal(false);
      resetForms();
    } catch (err) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openUpdateModal = (user) => {
    setSelectedUser(user);
    setEmail(user.email || "");
    setShowUpdateModal(true);
  };

  const openResetModal = (user) => {
    setSelectedUser(user);
    setEmail(user.email || "");
    setShowResetModal(true);
  };

  const displayUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status !== "Disabled").length;
  const disabledUsers = users.filter(u => u.status === "Disabled").length;

  return (
    <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-slate-500 mt-1">Manage all users and permissions.</p>
        </div>
        <button
          onClick={() => { resetForms(); setShowAddModal(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={18} />
          Add User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5">
        <StatCard icon={<Users size={20} />} title="Total Users" value={totalUsers.toString()} />
        <StatCard icon={<UserCheck size={20} />} title="Active Users" value={activeUsers.toString()} />
        <StatCard icon={<UserX size={20} />} title="Disabled Users" value={disabledUsers.toString()} />
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b flex justify-between bg-white">
          <div className="relative w-96">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              placeholder="Search user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 rounded-xl border border-slate-200 w-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="border border-slate-200 rounded-xl px-4 flex gap-2 items-center hover:bg-slate-50 transition-colors"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="text-left bg-slate-50/80 text-sm text-slate-500 font-medium">
              <tr>
                <th className="p-4 font-medium">User</th>
                <th className="font-medium">Email</th>
                <th className="font-medium">Role</th>
                <th className="font-medium">Status</th>
                <th className="font-medium">Last Login</th>
                <th className="font-medium text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-8">
                    <Loader2 className="animate-spin mx-auto text-blue-600" size={24} />
                  </td>
                </tr>
              ) : (
                displayUsers.map((user, idx) => (
                  <tr key={user.email || idx} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center font-medium shadow-sm">
                        {(user.name || "U")[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-900">{user.name || "Unknown User"}</span>
                    </td>
                    <td className="text-slate-600">{user.email}</td>
                    <td>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                        {user.role || "User"}
                      </span>
                    </td>
                    <td>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.status === "Active" || !user.status
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                        }`}>
                        {user.status || "Active"}
                      </span>
                    </td>
                    <td className="text-slate-500 text-sm">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : "Today"}
                    </td>
                    <td className="pr-6">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openUpdateModal(user)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
                          title="Update User"
                        >
                          <Edit2 size={16} /> Update
                        </button>
                        <button
                          onClick={() => openResetModal(user)}
                          className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
                          title="Reset Password"
                        >
                          <Key size={16} /> Reset
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
                          title="Delete User"
                        >
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <Modal
          title="Add New User"
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddSubmit}
          isSubmitting={isSubmitting}
          submitText="Create User"
        >
          <div className="space-y-4">
            <InputField label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <InputField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <InputField label="Metadata (Hello)" type="text" value={helloData} onChange={(e) => setHelloData(e.target.value)} placeholder="e.g. world" />
          </div>
        </Modal>
      )}

      {/* Update User Modal */}
      {showUpdateModal && (
        <Modal
          title={`Update ${selectedUser?.name || 'User'}`}
          onClose={() => setShowUpdateModal(false)}
          onSubmit={handleUpdateSubmit}
          isSubmitting={isSubmitting}
          submitText="Save Changes"
        >
          <div className="space-y-4">
            <InputField label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <InputField label="New Password (Optional)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep current" />
            <InputField label="Metadata (Hello)" type="text" value={helloData} onChange={(e) => setHelloData(e.target.value)} placeholder="e.g. world" />
          </div>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <Modal
          title="Reset Password"
          onClose={() => setShowResetModal(false)}
          onSubmit={handleResetSubmit}
          isSubmitting={isSubmitting}
          submitText="Reset Password"
          submitColor="bg-orange-600 hover:bg-orange-700"
        >
          <div className="space-y-4">
            <div className="bg-orange-50 text-orange-800 p-4 rounded-xl text-sm border border-orange-100">
              You are about to reset the password for <strong>{email}</strong>.
            </div>
            <InputField label="New Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
        </Modal>
      )}
    </div>
  );
}

// Reusable Components
function StatCard({ icon, title, value }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-slate-500 text-sm font-medium">{title}</p>
          <h2 className="text-3xl font-bold mt-2 text-slate-900">{value}</h2>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose, onSubmit, isSubmitting, submitText, submitColor = "bg-blue-600 hover:bg-blue-700" }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="p-6">
            {children}
          </div>
          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 rounded-xl font-medium text-white flex items-center gap-2 transition-colors shadow-sm ${submitColor} ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InputField({ label, type, value, onChange, placeholder, required = false }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white text-slate-900"
      />
    </div>
  );
}
