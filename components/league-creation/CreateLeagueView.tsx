'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  LeagueCreationModeSelector,
  ImportProviderSelector,
  ImportSourceInputPanel,
  ImportedLeaguePreviewPanel,
  type CreationMode,
} from '@/components/league-creation';
import { LeagueCreationWizard } from '@/components/league-creation-wizard';
import type { ImportPreviewResponse } from '@/lib/league-import/ImportedLeaguePreviewBuilder';
import type { ImportProvider } from '@/lib/league-import/types';
import { fetchImportPreview, submitImportCreation } from '@/lib/league-import/LeagueCreationImportSubmissionService';
import type { LeagueCreationWizardState } from '@/lib/league-creation-wizard/types';
import type { LeagueTemplatePayload } from '@/lib/league-templates/types';

/** Cache templates for the session to avoid refetch when toggling mode or remounting. TTL 5 min. */
const TEMPLATES_CACHE_TTL_MS = 5 * 60 * 1000;
let templatesCache: { list: LeagueTemplateListItem[]; ts: number } | null = null;

export interface LeagueTemplateListItem {
  id: string;
  name: string;
  description: string | null;
  payload: LeagueTemplatePayload;
}

export interface CreateLeagueViewProps {
  userId: string;
  /** Pre-select this template when opening create league (e.g. from Settings → Templates → Use). */
  initialTemplateId?: string;
}

export function CreateLeagueView({ userId, initialTemplateId }: CreateLeagueViewProps) {
  const router = useRouter();
  const [setupMode, setSetupMode] = useState<CreationMode>('create');
  const [importProvider, setImportProvider] = useState<ImportProvider | null>('sleeper');
  const [importSourceInput, setImportSourceInput] = useState('');
  const [importPreview, setImportPreview] = useState<ImportPreviewResponse | null>(null);
  const [importPreviewLoading, setImportPreviewLoading] = useState(false);
  const [createFromImportLoading, setCreateFromImportLoading] = useState(false);

  const [templates, setTemplates] = useState<LeagueTemplateListItem[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(initialTemplateId ?? null);
  const selectedTemplatePayload = selectedTemplateId
    ? (templates.find((t) => t.id === selectedTemplateId)?.payload as LeagueTemplatePayload | undefined)
    : undefined;

  const [saveTemplateState, setSaveTemplateState] = useState<{
    state: LeagueCreationWizardState;
    name: string;
    description: string;
  } | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const initialTemplateIdRef = useRef(initialTemplateId);
  initialTemplateIdRef.current = initialTemplateId;

  useEffect(() => {
    if (setupMode !== 'create') return;
    const now = Date.now();
    if (templatesCache && now - templatesCache.ts < TEMPLATES_CACHE_TTL_MS) {
      setTemplates(templatesCache.list);
      if (initialTemplateIdRef.current) {
        const has = templatesCache.list.some((t) => t.id === initialTemplateIdRef.current);
        if (has) setSelectedTemplateId(initialTemplateIdRef.current);
      }
      return;
    }
    setTemplatesLoading(true);
    fetch('/api/leagues/templates')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.templates)) {
          templatesCache = { list: data.templates, ts: Date.now() };
          setTemplates(data.templates);
          if (initialTemplateIdRef.current) {
            const has = data.templates.some((t: { id: string }) => t.id === initialTemplateIdRef.current);
            if (has) setSelectedTemplateId(initialTemplateIdRef.current);
          }
        }
      })
      .catch(() => {})
      .finally(() => setTemplatesLoading(false));
  }, [setupMode]);

  const handleFetchImportPreview = async () => {
    if (!importProvider) {
      toast.error('Select an import platform');
      return;
    }
    setImportPreviewLoading(true);
    setImportPreview(null);
    const result = await fetchImportPreview(importProvider, importSourceInput);
    setImportPreviewLoading(false);
    if (!result.ok) {
      toast.error(result.error ?? 'Failed to load league');
      return;
    }
    setImportPreview(result.data as ImportPreviewResponse);
  };

  const handleCreateFromImport = async () => {
    if (!importProvider || !importSourceInput.trim() || !importPreview) return;
    setCreateFromImportLoading(true);
    const result = await submitImportCreation(importProvider, importSourceInput, userId);
    setCreateFromImportLoading(false);
    if (!result.ok) {
      if (result.status === 409) toast.error('This league already exists in your account');
      else toast.error(result.error ?? 'Failed to create league');
      return;
    }
    toast.success('League imported! Redirecting...');
    const data = result.data as { league?: { id?: string } };
    const leagueId = data?.league?.id;
    setTimeout(() => {
      if (leagueId) router.push(`/app/league/${leagueId}`);
      else router.push('/app');
    }, 800);
  };

  const handleImportSourceInputChange = (value: string) => {
    setImportSourceInput(value);
    setImportPreview(null);
  };

  const handleSaveAsTemplate = (state: LeagueCreationWizardState) => {
    const { step: _s, ...payload } = state;
    setSaveTemplateState({
      state,
      name: state.name?.trim() || 'My template',
      description: '',
    });
  };

  const handleSubmitSaveTemplate = async () => {
    if (!saveTemplateState) return;
    const name = saveTemplateState.name.trim();
    if (!name) {
      toast.error('Template name is required');
      return;
    }
    const { step: _s, ...payload } = saveTemplateState.state;
    setSavingTemplate(true);
    try {
      const res = await fetch('/api/leagues/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: saveTemplateState.description.trim() || undefined,
          payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to save template');
        return;
      }
      toast.success('Template saved');
      const newItem = { id: data.id, name: data.name, description: data.description ?? null, payload };
      setTemplates((prev) => [newItem, ...prev]);
      if (templatesCache) templatesCache = { list: [newItem, ...templatesCache.list], ts: templatesCache.ts };
      setSaveTemplateState(null);
    } finally {
      setSavingTemplate(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
      <LeagueCreationModeSelector
        value={setupMode}
        onChange={(mode) => {
          setSetupMode(mode);
          if (mode === 'create') setImportPreview(null);
        }}
        disabled={importPreviewLoading || createFromImportLoading}
      />

      {setupMode === 'create' && (
        <>
          <div className="space-y-2">
            <Label>Start from template (optional)</Label>
            <select
              value={selectedTemplateId ?? ''}
              onChange={(e) => setSelectedTemplateId(e.target.value || null)}
              disabled={templatesLoading}
              className="w-full rounded-md border border-white/20 bg-gray-900 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
            >
              <option value="">None — build from scratch</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {saveTemplateState && (
            <div className="rounded-lg border border-purple-600/40 bg-gray-900/60 p-4 space-y-3">
              <p className="text-sm font-medium text-white">Save as template</p>
              <Input
                placeholder="Template name"
                value={saveTemplateState.name}
                onChange={(e) => setSaveTemplateState((s) => s && { ...s, name: e.target.value })}
                className="bg-gray-900 border-purple-600/40"
              />
              <Input
                placeholder="Description (optional)"
                value={saveTemplateState.description}
                onChange={(e) => setSaveTemplateState((s) => s && { ...s, description: e.target.value })}
                className="bg-gray-900 border-purple-600/40"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSubmitSaveTemplate}
                  disabled={savingTemplate}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {savingTemplate ? 'Saving…' : 'Save template'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSaveTemplateState(null)}
                  disabled={savingTemplate}
                  className="border-purple-600/40"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <LeagueCreationWizard
            key={selectedTemplateId ?? 'create'}
            initialWizardState={selectedTemplatePayload}
            onSaveAsTemplate={handleSaveAsTemplate}
            savingTemplate={savingTemplate}
          />
        </>
      )}

      {setupMode === 'import' && (
        <div className="space-y-5">
          <ImportProviderSelector
            value={importProvider}
            onChange={(p) => {
              setImportProvider(p);
              setImportSourceInput('');
              setImportPreview(null);
            }}
            disabled={importPreviewLoading || createFromImportLoading}
          />
          <ImportSourceInputPanel
            provider={importProvider}
            sourceInput={importSourceInput}
            onSourceInputChange={handleImportSourceInputChange}
            onFetchPreview={handleFetchImportPreview}
            loading={importPreviewLoading}
            disabled={createFromImportLoading}
          />
          <ImportedLeaguePreviewPanel
            provider={importProvider}
            preview={importPreview}
            loading={importPreviewLoading}
            onCreateFromImport={handleCreateFromImport}
            createLoading={createFromImportLoading}
            onBack={() => setImportPreview(null)}
          />
        </div>
      )}
    </div>
  );
}
