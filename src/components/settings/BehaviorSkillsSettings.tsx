import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import SuccessModal from '@/components/ui/SuccessModal';
import { showAppConfirm } from '@/lib/appMessageBox';

interface Trait {
    id: string;
    name: string;
    orderIndex: number;
    isActive: boolean;
}

interface Skill {
    id: string;
    name: string;
    orderIndex: number;
    isActive: boolean;
}

export default function BehaviorSkillsSettings() {
    const [activeTab, setActiveTab] = useState<'traits' | 'skills'>('traits');
    const [traits, setTraits] = useState<Trait[]>([]);
    const [skills, setSkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);
    const [newItemName, setNewItemName] = useState('');
    const [editingItem, setEditingItem] = useState<{ id: string, name: string } | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastAction, setLastAction] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [traitsRes, skillsRes] = await Promise.all([
                fetch('/api/traits'),
                fetch('/api/skills')
            ]);

            if (traitsRes.ok) setTraits(await traitsRes.json());
            if (skillsRes.ok) setSkills(await skillsRes.json());
        } catch (error) {
            console.error('Failed to fetch data', error);
            toast.error('Failed to load behavior and skills settings');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName.trim()) return;

        const endpoint = activeTab === 'traits' ? '/api/traits' : '/api/skills';
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newItemName })
            });

            if (!res.ok) throw new Error('Failed to create item');

            setLastAction(`Added new ${activeTab === 'traits' ? 'trait' : 'skill'}`);
            setShowSuccessModal(true);
            setNewItemName('');
            fetchData();
        } catch (error) {
            toast.error('Failed to add item');
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await showAppConfirm('Are you sure you want to delete this item?', {
            title: 'Delete Item',
            variant: 'warning',
            confirmText: 'Delete',
        });
        if (!confirmed) return;

        const endpoint = activeTab === 'traits' ? `/api/traits?id=${id}` : `/api/skills?id=${id}`;
        try {
            const res = await fetch(endpoint, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');

            setLastAction(`Deleted ${activeTab === 'traits' ? 'trait' : 'skill'}`);
            setShowSuccessModal(true);
            fetchData();
        } catch (error) {
            toast.error('Failed to delete item');
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem || !editingItem.name.trim()) return;

        const endpoint = activeTab === 'traits' ? '/api/traits' : '/api/skills';
        try {
            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingItem.id, name: editingItem.name })
            });

            if (!res.ok) throw new Error('Failed to update');

            setLastAction(`Updated ${activeTab === 'traits' ? 'trait' : 'skill'}`);
            setShowSuccessModal(true);
            setEditingItem(null);
            fetchData();
        } catch (error) {
            toast.error('Failed to update item');
        }
    };

    if (loading) return <div className="p-4 text-center">Loading settings...</div>;

    const currentList = activeTab === 'traits' ? traits : skills;

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Behavior & Skills Configuration</h2>

            {/* Tabs */}
            <div className="flex border-b mb-6">
                <button
                    className={`px-4 py-2 font-medium ${activeTab === 'traits' ? 'border-b-2 border-green-600 text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('traits')}
                >
                    Affective Traits
                </button>
                <button
                    className={`px-4 py-2 font-medium ${activeTab === 'skills' ? 'border-b-2 border-green-600 text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('skills')}
                >
                    Psychomotor Skills
                </button>
            </div>

            {/* Content */}
            <div className="space-y-6">
                {/* Add New Form */}
                <form onSubmit={handleAdd} className="flex gap-2">
                    <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder={`Add new ${activeTab === 'traits' ? 'trait' : 'skill'}...`}
                        className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                        type="submit"
                        disabled={!newItemName.trim()}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                        Add
                    </button>
                </form>

                {/* List */}
                <div className="border rounded divide-y">
                    {currentList.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">No items found. Add one above.</div>
                    ) : (
                        currentList.map((item) => (
                            <div key={item.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                                {editingItem?.id === item.id ? (
                                    <form onSubmit={handleUpdate} className="flex gap-2 flex-1 mr-4">
                                        <input
                                            type="text"
                                            value={editingItem.name}
                                            onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                            className="flex-1 border rounded px-2 py-1"
                                            autoFocus
                                        />
                                        <button type="submit" className="text-green-600 hover:text-green-800 text-sm font-medium">Save</button>
                                        <button type="button" onClick={() => setEditingItem(null)} className="text-gray-500 hover:text-gray-700 text-sm">Cancel</button>
                                    </form>
                                ) : (
                                    <>
                                        <span className="font-medium text-gray-700">{item.name}</span>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setEditingItem({ id: item.id, name: item.name })}
                                                className="text-blue-600 hover:text-blue-800 text-sm"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="text-red-600 hover:text-red-800 text-sm"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            <SuccessModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                title="Success!"
                message={lastAction}
            />
        </div>
    );
}
