import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import SuccessModal from '@/components/ui/SuccessModal';
import { showAppConfirm } from '@/lib/appMessageBox';

interface SchoolClass {
    id: string;
    name: string;
}

interface Trait {
    id: string;
    name: string;
    orderIndex: number;
    isActive: boolean;
    classIds: string[];
}

interface Skill {
    id: string;
    name: string;
    orderIndex: number;
    isActive: boolean;
    classIds: string[];
}

interface ClassSelectorProps {
    classes: SchoolClass[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
}

function ClassSelector({ classes, selectedIds, onChange }: ClassSelectorProps) {
    const allSelected = selectedIds.length === 0;

    const toggle = (classId: string) => {
        if (selectedIds.includes(classId)) {
            onChange(selectedIds.filter((id) => id !== classId));
        } else {
            onChange([...selectedIds, classId]);
        }
    };

    return (
        <div className="mt-2">
            <p className="text-xs text-gray-500 mb-1">Applies to:</p>
            <div className="flex flex-wrap gap-1.5">
                <button
                    type="button"
                    onClick={() => onChange([])}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                        allSelected
                            ? 'bg-green-100 border-green-400 text-green-700'
                            : 'bg-gray-100 border-gray-300 text-gray-500 hover:border-green-300'
                    }`}
                >
                    All Classes
                </button>
                {classes.map((cls) => (
                    <button
                        key={cls.id}
                        type="button"
                        onClick={() => toggle(cls.id)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                            selectedIds.includes(cls.id)
                                ? 'bg-blue-100 border-blue-400 text-blue-700'
                                : 'bg-gray-100 border-gray-300 text-gray-500 hover:border-blue-300'
                        }`}
                    >
                        {cls.name}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function BehaviorSkillsSettings() {
    const [activeTab, setActiveTab] = useState<'traits' | 'skills'>('traits');
    const [traits, setTraits] = useState<Trait[]>([]);
    const [skills, setSkills] = useState<Skill[]>([]);
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [newItemName, setNewItemName] = useState('');
    const [newItemClassIds, setNewItemClassIds] = useState<string[]>([]);
    const [editingItem, setEditingItem] = useState<{ id: string; name: string; classIds: string[] } | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastAction, setLastAction] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [traitsRes, skillsRes, classesRes] = await Promise.all([
                fetch('/api/traits'),
                fetch('/api/skills'),
                fetch('/api/classes'),
            ]);

            if (traitsRes.ok) setTraits(await traitsRes.json());
            if (skillsRes.ok) setSkills(await skillsRes.json());
            if (classesRes.ok) {
                const data = await classesRes.json();
                setClasses((data.classes ?? data ?? []).map((c: any) => ({ id: c.id, name: c.name })));
            }
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
                body: JSON.stringify({ name: newItemName, classIds: newItemClassIds }),
            });

            if (!res.ok) throw new Error('Failed to create item');

            setLastAction(`Added new ${activeTab === 'traits' ? 'trait' : 'skill'}`);
            setShowSuccessModal(true);
            setNewItemName('');
            setNewItemClassIds([]);
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
                body: JSON.stringify({
                    id: editingItem.id,
                    name: editingItem.name,
                    classIds: editingItem.classIds,
                }),
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

    const classLabel = (classIds: string[]) => {
        if (classIds.length === 0) return 'All Classes';
        return classIds
            .map((id) => classes.find((c) => c.id === id)?.name ?? id)
            .join(', ');
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-1">Behavior & Skills Configuration</h2>
            <p className="text-sm text-gray-500 mb-4">
                Assign traits and skills to specific classes, or leave unassigned to apply to all classes.
            </p>

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

            <div className="space-y-6">
                {/* Add New Form */}
                <form onSubmit={handleAdd} className="border rounded-lg p-4 bg-gray-50 space-y-3">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder={`New ${activeTab === 'traits' ? 'trait' : 'skill'} name...`}
                            className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <button
                            type="submit"
                            disabled={!newItemName.trim()}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
                        >
                            Add
                        </button>
                    </div>
                    {classes.length > 0 && (
                        <ClassSelector
                            classes={classes}
                            selectedIds={newItemClassIds}
                            onChange={setNewItemClassIds}
                        />
                    )}
                </form>

                {/* List */}
                <div className="border rounded divide-y">
                    {currentList.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">No items found. Add one above.</div>
                    ) : (
                        currentList.map((item) => (
                            <div key={item.id} className="p-3 hover:bg-gray-50">
                                {editingItem?.id === item.id ? (
                                    <form onSubmit={handleUpdate} className="space-y-3">
                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                value={editingItem.name}
                                                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                                className="flex-1 border rounded px-2 py-1"
                                                autoFocus
                                            />
                                            <button type="submit" className="text-green-600 hover:text-green-800 text-sm font-medium whitespace-nowrap">Save</button>
                                            <button type="button" onClick={() => setEditingItem(null)} className="text-gray-500 hover:text-gray-700 text-sm whitespace-nowrap">Cancel</button>
                                        </div>
                                        {classes.length > 0 && (
                                            <ClassSelector
                                                classes={classes}
                                                selectedIds={editingItem.classIds}
                                                onChange={(ids) => setEditingItem({ ...editingItem, classIds: ids })}
                                            />
                                        )}
                                    </form>
                                ) : (
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <span className="font-medium text-gray-700">{item.name}</span>
                                            <div className="mt-0.5 flex flex-wrap gap-1">
                                                {item.classIds.length === 0 ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                        All Classes
                                                    </span>
                                                ) : (
                                                    item.classIds.map((cid) => (
                                                        <span key={cid} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                                            {classes.find((c) => c.id === cid)?.name ?? cid}
                                                        </span>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-3 shrink-0">
                                            <button
                                                onClick={() => setEditingItem({ id: item.id, name: item.name, classIds: item.classIds })}
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
                                    </div>
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
