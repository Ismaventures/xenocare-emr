import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, User } from 'lucide-react';
import { DataTable } from '../../../components/ui/DataDisplay';
import { Button, Input } from '../../../components/ui/FormElements';
import { useStaffList, useDeleteStaff } from '../hooks/useStaff';
import { Staff } from '../../../types/database.types';
import { Modal } from '../../../components/ui/Modal';
import StaffForm from './StaffForm';
import { useToast } from '../../../components/ui/Toast';

export default function StaffList() {
  const { data: staffList, isLoading } = useStaffList();
  const deleteStaff = useDeleteStaff();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  const filteredStaff = staffList?.filter((staff) => {
    const query = searchQuery.toLowerCase();
    return (
      staff.first_name.toLowerCase().includes(query) ||
      staff.last_name.toLowerCase().includes(query) ||
      staff.staff_id.toLowerCase().includes(query) ||
      staff.email.toLowerCase().includes(query)
    );
  });

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        await deleteStaff.mutateAsync(id);
        showToast({ title: 'Staff deleted successfully', type: 'success' });
      } catch (error) {
        showToast({ title: 'Failed to delete staff', type: 'error' });
      }
    }
  };

  const handleEdit = (staff: Staff) => {
    setSelectedStaff(staff);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedStaff(null);
    setIsModalOpen(true);
  };

  const columns = [
    {
      key: 'photo',
      header: 'Photo',
      render: (staff: Staff) => (
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
          {staff.photo_url ? (
            <img
              src={staff.photo_url}
              alt={`${staff.first_name}'s photo`}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-5 h-5 text-gray-400" />
          )}
        </div>
      ),
    },
    {
      key: 'staff_id',
      header: 'Staff ID',
      render: (staff: Staff) => (
        <span className="font-mono text-sm">{staff.staff_id}</span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (staff: Staff) => (
        <span className="font-medium text-gray-900">
          {staff.first_name} {staff.last_name}
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (staff: Staff) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
          {staff.role.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (staff: Staff) => (
        <span className="text-sm text-gray-600">{staff.department || '-'}</span>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (staff: Staff) => (
        <div className="flex flex-col text-sm text-gray-600">
          <span>{staff.email}</span>
          <span className="text-xs text-gray-500">{staff.phone}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (staff: Staff) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            staff.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {staff.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (staff: Staff) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(staff);
            }}
          >
            <Edit className="w-4 h-4 text-gray-500" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(staff.id!);
            }}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500">
            Manage staff members and their privileges
          </p>
        </div>
        <Button onClick={handleAdd} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Staff
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <DataTable
        data={filteredStaff || []}
        columns={columns}
        isLoading={isLoading}
        keyField="id"
        emptyMessage="No staff members found"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedStaff ? 'Edit Staff' : 'Add New Staff'}
        size="lg"
      >
        <StaffForm
          initialData={selectedStaff}
          onSuccess={() => setIsModalOpen(false)}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
