import { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner@2.0.3';
import { useBridge } from '../contexts/BridgeContext';

export function Snapshots() {
  const { bridge, isReady } = useBridge();
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshots, setSelectedSnapshots] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [snapshotNote, setSnapshotNote] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isReady && bridge) {
      loadData();
    }
  }, [isReady, bridge]);

  const loadData = async () => {
    if (!bridge) return;
    
    try {
      setLoading(true);
      const [snapshotsData, projectsData] = await Promise.all([
        bridge.listSnapshots(),
        bridge.listProjects(),
      ]);

      if (Array.isArray(snapshotsData)) {
        setSnapshots(snapshotsData);
      }
      if (Array.isArray(projectsData)) {
        setProjects(projectsData);
      }
    } catch (error: any) {
      console.error('Failed to load snapshots:', error);
      toast.error('Failed to load snapshots');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSnapshot = (nameOrId: string) => {
    setSelectedSnapshots(prev =>
      prev.includes(nameOrId) ? prev.filter(s => s !== nameOrId) : [...prev, nameOrId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSnapshots.length === snapshots.length) {
      setSelectedSnapshots([]);
    } else {
      setSelectedSnapshots(snapshots.map((s: any) => s.name || s.snapshot_id));
    }
  };

  const handleCreateSnapshot = async () => {
    if (!bridge || !selectedProject || !snapshotName) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);
      await bridge.createSnapshot(
        selectedProject,
        snapshotName,
        snapshotNote || null,
        (message: string) => {
          toast.info(message);
        },
        (success: boolean, message: string) => {
          setCreating(false);
          if (success) {
            toast.success(message);
            setCreateOpen(false);
            setSnapshotName('');
            setSelectedProject('');
            setSnapshotNote('');
            loadData();
          } else {
            toast.error(message);
          }
        }
      );
    } catch (error: any) {
      setCreating(false);
      toast.error(`Failed to create snapshot: ${error.message}`);
    }
  };

  const handleDeleteSnapshots = async () => {
    if (!bridge || selectedSnapshots.length === 0) return;

    try {
      for (const nameOrId of selectedSnapshots) {
        const result = await bridge.deleteSnapshot(nameOrId);
        if (result.error) {
          toast.error(`Failed to delete ${nameOrId}: ${result.error}`);
        }
      }
      toast.success(`${selectedSnapshots.length} snapshot(s) deleted successfully!`);
      setDeleteOpen(false);
      setSelectedSnapshots([]);
      loadData();
    } catch (error: any) {
      toast.error(`Failed to delete snapshots: ${error.message}`);
    }
  };

  return (
    <div className="p-8">
      {/* Action Bar */}
      <div className="flex items-center gap-3 mb-6">
        <Button onClick={() => setCreateOpen(true)} className="bg-[#8B5CF6] hover:bg-[#7C3AED]">
          <Plus className="w-4 h-4 mr-2" />
          Create Snapshot
        </Button>
        <Button
          variant="destructive"
          className="bg-red-500/20 text-red-500 hover:bg-red-500/30 border-red-500/50"
          onClick={() => {
            if (selectedSnapshots.length === 0) {
              toast.error('Please select snapshots to delete');
            } else {
              setDeleteOpen(true);
            }
          }}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Selected
        </Button>
        <Button 
          variant="outline" 
          className="border-gray-700 hover:bg-[#2A2A2A] ml-auto"
          onClick={loadData}
          disabled={loading || !isReady}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Snapshots Table */}
      <Card className="bg-[#1E1E1E] border-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-800">
              <tr>
                <th className="text-left p-4">
                  <Checkbox
                    checked={selectedSnapshots.length === snapshots.length}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="text-left p-4 text-gray-400">Name</th>
                <th className="text-left p-4 text-gray-400">Project</th>
                <th className="text-left p-4 text-gray-400">Snapshot ID</th>
                <th className="text-left p-4 text-gray-400">AMI ID</th>
                <th className="text-left p-4 text-gray-400">Size</th>
                <th className="text-left p-4 text-gray-400">Cost</th>
                <th className="text-left p-4 text-gray-400">Created</th>
                <th className="text-left p-4 text-gray-400">Note</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400">Loading snapshots...</td>
                </tr>
              ) : snapshots.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400">No snapshots found</td>
                </tr>
              ) : (
                snapshots.map((snapshot: any) => {
                  const identifier = snapshot.name || snapshot.snapshot_id;
                  return (
                    <tr
                      key={identifier}
                      className={`border-b border-gray-800 hover:bg-[#2A2A2A] transition-colors ${
                        selectedSnapshots.includes(identifier) ? 'bg-[#2A2A2A]' : ''
                      }`}
                    >
                      <td className="p-4">
                        <Checkbox
                          checked={selectedSnapshots.includes(identifier)}
                          onCheckedChange={() => handleSelectSnapshot(identifier)}
                        />
                      </td>
                      <td className="p-4" title={snapshot.name}>{snapshot.name}</td>
                      <td className="p-4 text-gray-400" title={snapshot.project_name}>{snapshot.project_name}</td>
                      <td className="p-4 text-gray-400 font-mono text-sm" title={snapshot.snapshot_id}>{snapshot.snapshot_id}</td>
                      <td className="p-4 text-gray-400 font-mono text-sm" title={snapshot.ami_id}>{snapshot.ami_id || 'N/A'}</td>
                      <td className="p-4 text-gray-400">N/A</td>
                      <td className="p-4 text-gray-400">N/A</td>
                      <td className="p-4 text-gray-400">{snapshot.created_at ? new Date(snapshot.created_at).toLocaleDateString() : 'Unknown'}</td>
                      <td className="p-4 text-gray-400 max-w-xs truncate" title={snapshot.note}>
                        {snapshot.note || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedSnapshots.length > 0 && (
        <div className="mt-4 text-sm text-gray-400">
          {selectedSnapshots.length} snapshot(s) selected
        </div>
      )}

      {/* Create Snapshot Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#1E1E1E] border-gray-800">
          <DialogHeader>
            <DialogTitle>Create New Snapshot</DialogTitle>
            <DialogDescription className="text-gray-400">
              Create a snapshot of an existing project for backup or deployment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="bg-[#0F0F0F] border-gray-700">
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p: any) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Snapshot Name</Label>
              <Input
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                placeholder="my-snapshot-name"
                className="bg-[#0F0F0F] border-gray-700"
              />
              <p className="text-sm text-gray-400">Use lowercase letters, numbers, and hyphens only</p>
            </div>

            <div className="space-y-2">
              <Label>Note (Optional)</Label>
              <Textarea
                value={snapshotNote}
                onChange={(e) => setSnapshotNote(e.target.value)}
                placeholder="Add a description or note about this snapshot..."
                className="bg-[#0F0F0F] border-gray-700"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="border-gray-700">
              Cancel
            </Button>
            <Button
              onClick={handleCreateSnapshot}
              className="bg-[#8B5CF6] hover:bg-[#7C3AED]"
              disabled={!selectedProject || !snapshotName || creating || !isReady}
            >
              {creating ? 'Creating...' : 'Create Snapshot'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#1E1E1E] border-gray-800">
          <DialogHeader>
            <DialogTitle>Delete Snapshots</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete {selectedSnapshots.length} snapshot(s)?
            </DialogDescription>
          </DialogHeader>

          <Card className="bg-yellow-500/10 border-yellow-500/30 p-4">
            <div className="text-sm text-yellow-500">
              <div className="mb-2">Warning:</div>
              <ul className="list-disc list-inside space-y-1 text-gray-300">
                <li>This action cannot be undone</li>
                <li>Associated AMI images will also be deleted</li>
                <li>Projects using these snapshots may be affected</li>
              </ul>
            </div>
          </Card>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="border-gray-700">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSnapshots}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete {selectedSnapshots.length} Snapshot(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
