import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import DataTable, { type Column } from '@/components/common/DataTable';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { fetchWithAuth } from '@/lib/api';

export interface MasterSectionConfig<T> {
  typeLabel: string;
  endpoint: string;
  getId: (row: T) => string;
  getLabel: (row: T) => string;
  columns: Column<T>[];
  hasStatusToggle?: boolean;
  searchPlaceholder: string;
  searchPredicate: (row: T, lowerQuery: string) => boolean;
  newPath: string;
  editPath: (row: T) => string;
  emptyMessage?: string;
  preFilter?: (rows: T[]) => T[];
  toolbar?: ReactNode;
}

export default function MasterSection<T extends { is_active?: boolean }>({ config }: { config: MasterSectionConfig<T> }) {
  const navigate = useNavigate();
  const [data, setData] = useState<T[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [toggleTarget, setToggleTarget] = useState<T | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchWithAuth<T[]>(config.endpoint);
      setData(Array.isArray(list) ? list : []);
    } catch { /* empty */ }
    setLoading(false);
  }, [config.endpoint]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchWithAuth<T[]>(config.endpoint);
        if (!cancelled) setData(Array.isArray(list) ? list : []);
      } catch { /* empty */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [config.endpoint]);

  const filtered = useMemo(() => {
    const base = config.preFilter ? config.preFilter(data) : data;
    if (!searchQuery) return base;
    const lower = searchQuery.toLowerCase();
    return base.filter((row) => config.searchPredicate(row, lower));
  }, [data, searchQuery, config]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetchWithAuth(`${config.endpoint}/${config.getId(deleteTarget)}`, { method: 'DELETE' });
      setDeleteTarget(null);
      await load();
    } catch { /* empty */ }
    setDeleting(false);
  };

  const handleToggle = async () => {
    if (!toggleTarget) return;
    await fetchWithAuth(`${config.endpoint}/${config.getId(toggleTarget)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: !toggleTarget.is_active }),
    });
    setToggleTarget(null);
    await load();
  };

  const columns: Column<T>[] = useMemo(() => {
    if (!config.hasStatusToggle) return config.columns;
    const toggleCol: Column<T> = {
      key: 'is_active',
      label: '활성',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Switch checked={!!row.is_active} onCheckedChange={() => setToggleTarget(row)} />
          <Badge variant={row.is_active ? 'default' : 'secondary'} className="text-[10px]">
            {row.is_active ? '활성' : '비활성'}
          </Badge>
        </div>
      ),
    };
    return [...config.columns, toggleCol];
  }, [config.columns, config.hasStatusToggle]);

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>{config.toolbar}</div>
        <Button size="sm" onClick={() => navigate(config.newPath)}>
          <Plus className="mr-1.5 h-4 w-4" />새로 등록
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        searchable
        searchPlaceholder={config.searchPlaceholder}
        onSearch={setSearchQuery}
        emptyMessage={config.emptyMessage}
        actions={(row) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => navigate(config.editPath(row))}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => setDeleteTarget(row)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      />
      {config.hasStatusToggle && (
        <ConfirmDialog
          open={!!toggleTarget}
          onOpenChange={() => setToggleTarget(null)}
          title="상태 변경"
          description={toggleTarget
            ? `${config.getLabel(toggleTarget)}을(를) ${toggleTarget.is_active ? '비활성' : '활성'}으로 변경하시겠습니까?`
            : ''}
          onConfirm={handleToggle}
        />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title={`${config.typeLabel} 삭제`}
        description={deleteTarget
          ? `"${config.getLabel(deleteTarget)}"을(를) 삭제하시겠습니까? 연결된 데이터가 있으면 삭제가 실패할 수 있습니다.`
          : ''}
        onConfirm={handleDelete}
        confirmLabel={deleting ? '삭제 중...' : '삭제'}
        variant="destructive"
      />
    </>
  );
}
