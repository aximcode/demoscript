/**
 * StepEditor - Form-based step editing for Visual Editor
 * Provides editable verb dropdown, endpoint field, and auto-generated form fields
 */

import { useState, useCallback, useEffect } from 'react';
import { useDemo } from '../../context/DemoContext';
import { useOpenApiForm } from '../../hooks/useOpenApiForm';
import { useRestFormState } from '../../hooks/useRestFormState';
import { RestFormFields } from '../rest/RestFormFields';
import { ResponseDisplay } from '../rest/ResponseDisplay';
import { executeRequest } from '../../lib/execute-adapter';
import { substituteVariables } from '../../lib/variable-substitution';
import { buildRequestBody, buildQueryString } from '../../lib/rest-helpers';
import { GroupChildItem } from './GroupComponents';
import {
  parseRestMethod,
  isRestStep,
  isSlideStep,
  isShellStep,
  isStepGroup,
  isGraphQLStep,
  isCodeStep,
  isWaitStep,
  isBrowserStep,
  isAssertStep,
  isDatabaseStep,
  isFormStep,
  isTerminalStep,
  isPollStep,
  getSlideContent,
  getShellCommand,
  getGraphQLQuery,
  getCodeSource,
  getWaitDuration,
  getBrowserUrl,
  getAssertCondition,
  getDatabaseOperation,
  getFormTitle,
  getTerminalContent,
  getPollEndpoint,
  type RestStep,
  type ExplicitRestStep,
  type SlideStep,
  type ExplicitSlideStep,
  type ShellStep,
  type ExplicitShellStep,
  type GraphQLStep,
  type ExplicitGraphQLStep,
  type CodeStep,
  type ExplicitCodeStep,
  type WaitStep,
  type ExplicitWaitStep,
  type BrowserStep,
  type ExplicitBrowserStep,
  type AssertStep,
  type ExplicitAssertStep,
  type DatabaseStep,
  type ExplicitDatabaseStep,
  type FormStep,
  type ExplicitFormStep,
  type TerminalStep,
  type ExplicitTerminalStep,
  type PollStep,
  type ExplicitPollStep,
  type FormField,
  type StepOrGroup,
  type StepGroup,
} from '../../types/schema';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;

interface StepEditorProps {
  step: StepOrGroup;
  onChange: (step: StepOrGroup) => void;
  onDelete?: () => void;
  // Group-specific callbacks
  groupIndex?: number;
  onDeleteFromGroup?: (groupIndex: number, childIndex: number) => void;
  onReorderWithinGroup?: (groupIndex: number, fromChildIndex: number, toChildIndex: number) => void;
  onFlattenGroup?: (groupIndex: number) => void;
}

export function StepEditor({ step, onChange, onDelete, groupIndex, onDeleteFromGroup, onReorderWithinGroup, onFlattenGroup }: StepEditorProps) {
  if (isStepGroup(step)) {
    return (
      <GroupEditor
        step={step}
        onChange={onChange}
        onDelete={onDelete}
        groupIndex={groupIndex}
        onDeleteFromGroup={onDeleteFromGroup}
        onReorderWithinGroup={onReorderWithinGroup}
        onFlattenGroup={onFlattenGroup}
      />
    );
  }

  if (isRestStep(step)) {
    return <RestStepEditor step={step} onChange={onChange} onDelete={onDelete} />;
  }

  if (isSlideStep(step)) {
    return <SlideStepEditor step={step} onChange={onChange} onDelete={onDelete} />;
  }

  if (isShellStep(step)) {
    return <ShellStepEditor step={step} onChange={onChange} onDelete={onDelete} />;
  }

  if (isGraphQLStep(step)) {
    return <GraphQLStepEditor step={step} onChange={onChange} onDelete={onDelete} />;
  }

  if (isCodeStep(step)) {
    return <CodeStepEditor step={step} onChange={onChange} onDelete={onDelete} />;
  }

  if (isWaitStep(step)) {
    return <WaitStepEditor step={step} onChange={onChange} onDelete={onDelete} />;
  }

  if (isBrowserStep(step)) {
    return <BrowserStepEditor step={step} onChange={onChange} onDelete={onDelete} />;
  }

  if (isAssertStep(step)) {
    return <AssertStepEditor step={step} onChange={onChange} onDelete={onDelete} />;
  }

  if (isDatabaseStep(step)) {
    return <DatabaseStepEditor step={step} onChange={onChange} onDelete={onDelete} />;
  }

  if (isFormStep(step)) {
    return <FormStepEditor step={step} onChange={onChange} onDelete={onDelete} />;
  }

  if (isTerminalStep(step)) {
    return <TerminalStepEditor step={step} onChange={onChange} onDelete={onDelete} />;
  }

  if (isPollStep(step)) {
    return <PollStepEditor step={step} onChange={onChange} onDelete={onDelete} />;
  }

  return (
    <div className="p-4 text-gray-500">
      Unsupported step type
    </div>
  );
}

// REST Step Editor
interface RestStepEditorProps {
  step: RestStep | ExplicitRestStep;
  onChange: (step: StepOrGroup) => void;
  onDelete?: () => void;
}

function RestStepEditor({ step, onChange, onDelete }: RestStepEditorProps) {
  const { state } = useDemo();

  // Parse current method and endpoint
  const { method: parsedMethod, endpoint: parsedEndpoint } = parseRestMethod(step);

  // Local state for editing
  const [method, setMethod] = useState(parsedMethod);
  const [endpoint, setEndpoint] = useState(parsedEndpoint);
  const [title, setTitle] = useState(step.title || '');
  const [description, setDescription] = useState(step.description || '');
  const [stepBaseUrl, setStepBaseUrl] = useState(step.base_url || '');

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [response, setResponse] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get base URL and OpenAPI URL from step or settings
  const baseUrl = step.base_url || state.config?.settings?.base_url || '';
  const openapiUrl = step.openapi || state.config?.settings?.openapi;

  // Generate form fields from OpenAPI
  const { formFields: generatedForm, isLoading: isLoadingForm } = useOpenApiForm({
    openapiUrl,
    method,
    path: endpoint,
    defaults: step.defaults,
    manualForm: step.form,
  });

  const effectiveForm = generatedForm || step.form || [];

  // Form state management
  const {
    formValues,
    setFormValues,
    isFieldModified,
  } = useRestFormState({ form: effectiveForm, variables: state.variables });

  // Build updated step preserving existing properties
  const buildUpdatedStep = useCallback((
    newMethod: string,
    newEndpoint: string,
    newTitle: string,
    newDescription: string,
    newDefaults?: Record<string, unknown>
  ): RestStep => {
    return {
      rest: `${newMethod} ${newEndpoint}`,
      title: newTitle || undefined,
      description: newDescription || undefined,
      defaults: newDefaults ?? step.defaults,
      form: 'form' in step ? step.form : undefined,
      save: 'save' in step ? step.save : undefined,
      results: 'results' in step ? step.results : undefined,
      headers: 'headers' in step ? step.headers : undefined,
      base_url: 'base_url' in step ? step.base_url : undefined,
      openapi: 'openapi' in step ? step.openapi : undefined,
    };
  }, [step]);

  // Update step when method/endpoint changes
  const handleMethodChange = useCallback((newMethod: string) => {
    setMethod(newMethod);
    onChange(buildUpdatedStep(newMethod, endpoint, title, description));
  }, [endpoint, title, description, buildUpdatedStep, onChange]);

  const handleEndpointChange = useCallback((newEndpoint: string) => {
    setEndpoint(newEndpoint);
    onChange(buildUpdatedStep(method, newEndpoint, title, description));
  }, [method, title, description, buildUpdatedStep, onChange]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    onChange(buildUpdatedStep(method, endpoint, newTitle, description));
  }, [method, endpoint, description, buildUpdatedStep, onChange]);

  const handleDescriptionChange = useCallback((newDescription: string) => {
    setDescription(newDescription);
    onChange(buildUpdatedStep(method, endpoint, title, newDescription));
  }, [method, endpoint, title, buildUpdatedStep, onChange]);

  const handleBaseUrlChange = useCallback((newBaseUrl: string) => {
    setStepBaseUrl(newBaseUrl);
    onChange({
      ...buildUpdatedStep(method, endpoint, title, description),
      base_url: newBaseUrl || undefined,
    });
  }, [method, endpoint, title, description, buildUpdatedStep, onChange]);

  // Update defaults when form values change
  const handleFormChange = useCallback((name: string, value: string | number | boolean) => {
    setFormValues(prev => ({ ...prev, [name]: value }));

    // Update step defaults
    const newDefaults = { ...(step.defaults || {}), [name]: value };
    onChange(buildUpdatedStep(method, endpoint, title, description, newDefaults));
  }, [method, endpoint, title, description, step.defaults, buildUpdatedStep, setFormValues, onChange]);

  // Execute request
  const handleExecute = useCallback(async () => {
    setIsExecuting(true);
    setError(null);
    setResponse(null);

    try {
      const resolvedEndpoint = substituteVariables(endpoint, state.variables);
      const fullUrl = `${baseUrl}${resolvedEndpoint}`;

      // Build request body from form values
      const bodyFields = effectiveForm.filter(f => f.paramIn === 'body' || !f.paramIn);
      const queryFields = effectiveForm.filter(f => f.paramIn === 'query');

      let requestUrl = fullUrl;
      if (queryFields.length > 0) {
        const queryString = buildQueryString(queryFields, formValues);
        if (queryString) {
          requestUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
        }
      }

      const body = ['POST', 'PUT', 'PATCH'].includes(method)
        ? buildRequestBody(bodyFields, formValues)
        : undefined;

      const result = await executeRequest({
        method,
        url: requestUrl,
        headers: step.headers,
        body,
      });

      setResponse(result.data as Record<string, unknown>);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setIsExecuting(false);
    }
  }, [endpoint, baseUrl, method, effectiveForm, formValues, state.variables, step.headers]);

  // Sync local state when step changes from outside
  useEffect(() => {
    const { method: m, endpoint: e } = parseRestMethod(step);
    setMethod(m);
    setEndpoint(e);
    setTitle(step.title || '');
    setDescription(step.description || '');
    setStepBaseUrl(step.base_url || '');
  }, [step]);

  return (
    <div className="flex flex-col h-full">
      {/* Header with method and endpoint */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          {/* Method dropdown */}
          <select
            value={method}
            onChange={(e) => handleMethodChange(e.target.value)}
            className="px-2 py-1.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {HTTP_METHODS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* Endpoint input */}
          <input
            type="text"
            value={endpoint}
            onChange={(e) => handleEndpointChange(e.target.value)}
            placeholder="/api/endpoint"
            className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
          />

          {/* Delete button */}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors"
              title="Delete step"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        {/* Title input */}
        <div className="mb-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Step title (optional)"
            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Description input */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Optional description"
            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* URL field */}
        <div className="mb-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
            URL {state.config?.settings?.base_url && !stepBaseUrl && <span className="font-normal">(from settings)</span>}
          </label>
          <input
            type="text"
            value={stepBaseUrl || state.config?.settings?.base_url || ''}
            onChange={(e) => handleBaseUrlChange(e.target.value)}
            placeholder="https://api.example.com"
            disabled={endpoint.startsWith('http://') || endpoint.startsWith('https://')}
            className={`w-full px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              endpoint.startsWith('http://') || endpoint.startsWith('https://')
                ? 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500'
                : 'bg-gray-50 dark:bg-slate-800/50'
            }`}
          />
        </div>

        {/* Full URL preview */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
          <span>→</span>
          <span className="font-mono truncate">
            {substituteVariables(
              (endpoint.startsWith('http://') || endpoint.startsWith('https://')) ? endpoint : (stepBaseUrl || state.config?.settings?.base_url || '') + endpoint,
              state.variables
            ) || 'Enter URL and endpoint'}
          </span>
        </div>
      </div>

      {/* Form fields */}
      <div className="flex-1 overflow-auto p-4">
        {isLoadingForm ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
            <span className="ml-2 text-sm text-gray-500">Loading form fields...</span>
          </div>
        ) : effectiveForm.length > 0 ? (
          <div className="space-y-4">
            <h4 className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              Request Parameters
            </h4>
            <RestFormFields
              fields={effectiveForm}
              values={formValues}
              onChange={handleFormChange}
              isFieldModified={isFieldModified}
              disabled={isExecuting}
            />
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 dark:text-slate-500">
            <p className="text-sm">No form fields</p>
            <p className="text-xs mt-1">Configure an OpenAPI spec to auto-generate fields</p>
          </div>
        )}

        {/* Execute button */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={handleExecute}
            disabled={isExecuting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
          >
            {isExecuting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Executing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Execute
              </>
            )}
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{String(error)}</p>
          </div>
        )}

        {/* Response display */}
        {response && (
          <div className="mt-4">
            <h4 className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Response
            </h4>
            <ResponseDisplay response={response} results={step.results} />
          </div>
        )}
      </div>
    </div>
  );
}

// Slide Step Editor
interface SlideStepEditorProps {
  step: SlideStep | ExplicitSlideStep;
  onChange: (step: StepOrGroup) => void;
  onDelete?: () => void;
}

function SlideStepEditor({ step, onChange, onDelete }: SlideStepEditorProps) {
  const content = getSlideContent(step);
  const [editContent, setEditContent] = useState(content);
  const [title, setTitle] = useState(step.title || '');

  const handleContentChange = useCallback((newContent: string) => {
    setEditContent(newContent);
    const newStep: SlideStep = { slide: newContent };
    if (title) newStep.title = title;
    onChange(newStep);
  }, [title, onChange]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    const newStep: SlideStep = { slide: editContent };
    if (newTitle) newStep.title = newTitle;
    onChange(newStep);
  }, [editContent, onChange]);

  // Sync when step changes externally
  useEffect(() => {
    setEditContent(getSlideContent(step));
    setTitle(step.title || '');
  }, [step]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded">
              SLIDE
            </span>
            <span className="text-sm text-gray-600 dark:text-slate-400">Markdown Content</span>
          </div>
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors"
              title="Delete step"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        {/* Title input */}
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Step title (optional)"
          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Content editor */}
      <div className="flex-1 p-4">
        <textarea
          value={editContent}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="# Slide Title

Write your markdown content here..."
          className="w-full h-full min-h-[200px] px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
    </div>
  );
}

// Shell Step Editor
interface ShellStepEditorProps {
  step: ShellStep | ExplicitShellStep;
  onChange: (step: StepOrGroup) => void;
  onDelete?: () => void;
}

function ShellStepEditor({ step, onChange, onDelete }: ShellStepEditorProps) {
  const command = getShellCommand(step);
  const [editCommand, setEditCommand] = useState(command);
  const [title, setTitle] = useState(step.title || '');

  const handleCommandChange = useCallback((newCommand: string) => {
    setEditCommand(newCommand);
    // Always use concise syntax for simplicity
    const newStep: ShellStep = { shell: newCommand };
    if (title) newStep.title = title;
    onChange(newStep);
  }, [title, onChange]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    const newStep: ShellStep = { shell: editCommand };
    if (newTitle) newStep.title = newTitle;
    onChange(newStep);
  }, [editCommand, onChange]);

  // Sync when step changes externally
  useEffect(() => {
    setEditCommand(getShellCommand(step));
    setTitle(step.title || '');
  }, [step]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs font-medium rounded">
            SHELL
          </span>
          <span className="text-sm text-gray-600 dark:text-slate-400">Command</span>
        </div>
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors"
            title="Delete step"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Title input */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
            Title (optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Step title"
            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Command input */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
            Command
          </label>
          <textarea
            value={editCommand}
            onChange={(e) => handleCommandChange(e.target.value)}
            placeholder="echo 'Hello World'"
            rows={3}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
    </div>
  );
}

// Group Editor
interface GroupEditorProps {
  step: StepGroup;
  onChange: (step: StepOrGroup) => void;
  onDelete?: () => void;
  groupIndex?: number;
  onDeleteFromGroup?: (groupIndex: number, childIndex: number) => void;
  onReorderWithinGroup?: (groupIndex: number, fromChildIndex: number, toChildIndex: number) => void;
  onFlattenGroup?: (groupIndex: number) => void;
}

function GroupEditor({ step, onChange, onDelete, groupIndex, onDeleteFromGroup, onReorderWithinGroup, onFlattenGroup }: GroupEditorProps) {
  const [groupName, setGroupName] = useState(step.group);
  const [description, setDescription] = useState(step.description || '');
  const [collapsed, setCollapsed] = useState(step.collapsed || false);

  const handleNameChange = useCallback((name: string) => {
    setGroupName(name);
    onChange({ ...step, group: name });
  }, [step, onChange]);

  const handleDescriptionChange = useCallback((desc: string) => {
    setDescription(desc);
    const newStep = { ...step, description: desc || undefined };
    if (!desc) delete newStep.description;
    onChange(newStep);
  }, [step, onChange]);

  const handleCollapsedChange = useCallback((value: boolean) => {
    setCollapsed(value);
    const newStep = { ...step, collapsed: value || undefined };
    if (!value) delete newStep.collapsed;
    onChange(newStep);
  }, [step, onChange]);

  const handleMoveUp = useCallback((childIndex: number) => {
    if (groupIndex !== undefined && onReorderWithinGroup && childIndex > 0) {
      onReorderWithinGroup(groupIndex, childIndex, childIndex - 1);
    }
  }, [groupIndex, onReorderWithinGroup]);

  const handleMoveDown = useCallback((childIndex: number) => {
    if (groupIndex !== undefined && onReorderWithinGroup && childIndex < step.steps.length - 1) {
      onReorderWithinGroup(groupIndex, childIndex, childIndex + 1);
    }
  }, [groupIndex, onReorderWithinGroup, step.steps.length]);

  const handleDeleteChild = useCallback((childIndex: number) => {
    if (groupIndex !== undefined && onDeleteFromGroup) {
      onDeleteFromGroup(groupIndex, childIndex);
    }
  }, [groupIndex, onDeleteFromGroup]);

  const handleFlatten = useCallback(() => {
    if (groupIndex !== undefined && onFlattenGroup) {
      onFlattenGroup(groupIndex);
    }
  }, [groupIndex, onFlattenGroup]);

  // Sync state when step changes externally
  useEffect(() => {
    setGroupName(step.group);
    setDescription(step.description || '');
    setCollapsed(step.collapsed || false);
  }, [step]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded">
            GROUP
          </span>
        </div>
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors"
            title="Delete group"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto">
        {/* Group Name */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
            Group Name
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Group name"
            className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Description */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Describe what steps are in this group..."
            rows={2}
            className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>

        {/* Collapsed by Default Toggle */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-700 dark:text-slate-300">Collapsed by default</span>
            <p className="text-xs text-gray-500 dark:text-slate-400">Start this group collapsed in the sidebar</p>
          </div>
          <button
            type="button"
            onClick={() => handleCollapsedChange(!collapsed)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
              collapsed ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-600'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                collapsed ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Child Steps List */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
              Steps ({step.steps.length})
            </span>
          </div>

          {step.steps.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 italic py-4 text-center">
              This group is empty. Drag steps here to add them.
            </p>
          ) : (
            <div className="space-y-1">
              {step.steps.map((child, index) => (
                <GroupChildItem
                  key={index}
                  step={child}
                  index={index}
                  actions={{
                    onMoveUp: () => handleMoveUp(index),
                    onMoveDown: () => handleMoveDown(index),
                    onDelete: () => handleDeleteChild(index),
                    isFirst: index === 0,
                    isLast: index === step.steps.length - 1,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer with Flatten button */}
      {step.steps.length > 0 && onFlattenGroup && groupIndex !== undefined && (
        <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
          <button
            onClick={handleFlatten}
            className="w-full px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
          >
            Flatten Group
          </button>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 text-center">
            Move all steps to top level and remove group
          </p>
        </div>
      )}
    </div>
  );
}

// GraphQL Step Editor
interface GraphQLStepEditorProps {
  step: GraphQLStep | ExplicitGraphQLStep;
  onChange: (step: StepOrGroup) => void;
  onDelete?: () => void;
}

function GraphQLStepEditor({ step, onChange, onDelete }: GraphQLStepEditorProps) {
  const { state } = useDemo();
  const query = getGraphQLQuery(step);
  const [editQuery, setEditQuery] = useState(query);
  const [title, setTitle] = useState(step.title || '');
  const [description, setDescription] = useState(step.description || '');
  const [endpoint, setEndpoint] = useState(step.endpoint || '/graphql');
  const [stepBaseUrl, setStepBaseUrl] = useState(step.base_url || '');

  // Compute resolved URL for display
  // If endpoint is a full URL, use it directly; otherwise prepend base_url
  const isFullUrl = endpoint.startsWith('http://') || endpoint.startsWith('https://');
  const resolvedUrl = substituteVariables(
    isFullUrl ? endpoint : (stepBaseUrl || state.config?.settings?.base_url || '') + endpoint,
    state.variables
  );

  const buildStep = useCallback((q: string, t: string, desc: string, ep: string, base: string): GraphQLStep => {
    const newStep: GraphQLStep = { graphql: q };
    if (t) newStep.title = t;
    if (desc) newStep.description = desc;
    if (ep) newStep.endpoint = ep;
    if (base) newStep.base_url = base;
    return newStep;
  }, []);

  const handleQueryChange = useCallback((newQuery: string) => {
    setEditQuery(newQuery);
    onChange(buildStep(newQuery, title, description, endpoint, stepBaseUrl));
  }, [title, description, endpoint, stepBaseUrl, buildStep, onChange]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    onChange(buildStep(editQuery, newTitle, description, endpoint, stepBaseUrl));
  }, [editQuery, description, endpoint, stepBaseUrl, buildStep, onChange]);

  const handleDescriptionChange = useCallback((newDescription: string) => {
    setDescription(newDescription);
    onChange(buildStep(editQuery, title, newDescription, endpoint, stepBaseUrl));
  }, [editQuery, title, endpoint, stepBaseUrl, buildStep, onChange]);

  const handleEndpointChange = useCallback((newEndpoint: string) => {
    setEndpoint(newEndpoint);
    onChange(buildStep(editQuery, title, description, newEndpoint, stepBaseUrl));
  }, [editQuery, title, description, stepBaseUrl, buildStep, onChange]);

  const handleBaseUrlChange = useCallback((newBaseUrl: string) => {
    setStepBaseUrl(newBaseUrl);
    onChange(buildStep(editQuery, title, description, endpoint, newBaseUrl));
  }, [editQuery, title, description, endpoint, buildStep, onChange]);

  useEffect(() => {
    setEditQuery(getGraphQLQuery(step));
    setTitle(step.title || '');
    setDescription(step.description || '');
    setEndpoint(step.endpoint || '/graphql');
    setStepBaseUrl(step.base_url || '');
  }, [step]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 text-xs font-medium rounded">
              GRAPHQL
            </span>
          </div>
          {onDelete && (
            <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Delete step">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        {/* Title input */}
        <div className="mb-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Step title (optional)"
            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Description input */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Optional description"
            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* URL field */}
        <div className="mb-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
            URL {state.config?.settings?.base_url && !stepBaseUrl && <span className="font-normal">(from settings)</span>}
          </label>
          <input
            type="text"
            value={stepBaseUrl || state.config?.settings?.base_url || ''}
            onChange={(e) => handleBaseUrlChange(e.target.value)}
            placeholder="https://api.example.com"
            disabled={isFullUrl}
            className={`w-full px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              isFullUrl
                ? 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500'
                : 'bg-gray-50 dark:bg-slate-800/50'
            }`}
          />
        </div>

        {/* Endpoint input */}
        <div className="mb-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Endpoint</label>
          <input
            type="text"
            value={endpoint}
            onChange={(e) => handleEndpointChange(e.target.value)}
            placeholder="/graphql"
            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Full URL preview */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
          <span>→</span>
          <span className="font-mono truncate">{resolvedUrl || 'Enter URL and endpoint'}</span>
        </div>
      </div>
      <div className="flex-1 p-4">
        <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Query</label>
        <textarea value={editQuery} onChange={(e) => handleQueryChange(e.target.value)} placeholder="query { ... }" rows={10}
          className="w-full h-full min-h-[200px] px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary-500" />
      </div>
    </div>
  );
}

// Code Step Editor
interface CodeStepEditorProps {
  step: CodeStep | ExplicitCodeStep;
  onChange: (step: StepOrGroup) => void;
  onDelete?: () => void;
}

function CodeStepEditor({ step, onChange, onDelete }: CodeStepEditorProps) {
  const source = getCodeSource(step);
  const [editSource, setEditSource] = useState(source);
  const [title, setTitle] = useState(step.title || '');
  const [language, setLanguage] = useState(step.language || 'javascript');
  const [filename, setFilename] = useState(step.filename || '');

  const buildStep = useCallback((src: string, t: string, lang: string, fn: string): CodeStep => {
    const newStep: CodeStep = { code: src };
    if (t) newStep.title = t;
    if (lang) newStep.language = lang;
    if (fn) newStep.filename = fn;
    return newStep;
  }, []);

  useEffect(() => {
    setEditSource(getCodeSource(step));
    setTitle(step.title || '');
    setLanguage(step.language || 'javascript');
    setFilename(step.filename || '');
  }, [step]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">CODE</span>
          </div>
          {onDelete && (
            <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Delete step">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); onChange(buildStep(editSource, e.target.value, language, filename)); }} placeholder="Title (optional)"
            className="px-3 py-1.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <input type="text" value={language} onChange={(e) => { setLanguage(e.target.value); onChange(buildStep(editSource, title, e.target.value, filename)); }} placeholder="Language"
            className="px-3 py-1.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <input type="text" value={filename} onChange={(e) => { setFilename(e.target.value); onChange(buildStep(editSource, title, language, e.target.value)); }} placeholder="Filename (optional)"
          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" />
      </div>
      <div className="flex-1 p-4">
        <textarea value={editSource} onChange={(e) => { setEditSource(e.target.value); onChange(buildStep(e.target.value, title, language, filename)); }} placeholder="// Your code here"
          className="w-full h-full min-h-[200px] px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary-500" />
      </div>
    </div>
  );
}

// Wait Step Editor
interface WaitStepEditorProps {
  step: WaitStep | ExplicitWaitStep;
  onChange: (step: StepOrGroup) => void;
  onDelete?: () => void;
}

function WaitStepEditor({ step, onChange, onDelete }: WaitStepEditorProps) {
  const duration = getWaitDuration(step);
  const [editDuration, setEditDuration] = useState(duration);
  const [title, setTitle] = useState(step.title || '');
  const [message, setMessage] = useState(step.message || '');

  const buildStep = useCallback((dur: number, t: string, msg: string): WaitStep => {
    const newStep: WaitStep = { wait: dur };
    if (t) newStep.title = t;
    if (msg) newStep.message = msg;
    return newStep;
  }, []);

  useEffect(() => {
    setEditDuration(getWaitDuration(step));
    setTitle(step.title || '');
    setMessage(step.message || '');
  }, [step]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-medium rounded">WAIT</span>
          </div>
          {onDelete && (
            <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Delete step">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
        <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); onChange(buildStep(editDuration, e.target.value, message)); }} placeholder="Title (optional)"
          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
      </div>
      <div className="flex-1 p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Duration (ms)</label>
          <input type="number" value={editDuration} onChange={(e) => { const d = parseInt(e.target.value) || 0; setEditDuration(d); onChange(buildStep(d, title, message)); }} min={0}
            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Message (optional)</label>
          <input type="text" value={message} onChange={(e) => { setMessage(e.target.value); onChange(buildStep(editDuration, title, e.target.value)); }} placeholder="Waiting..."
            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
      </div>
    </div>
  );
}

// Browser Step Editor
interface BrowserStepEditorProps {
  step: BrowserStep | ExplicitBrowserStep;
  onChange: (step: StepOrGroup) => void;
  onDelete?: () => void;
}

function BrowserStepEditor({ step, onChange, onDelete }: BrowserStepEditorProps) {
  const url = getBrowserUrl(step);
  const [editUrl, setEditUrl] = useState(url);
  const [title, setTitle] = useState(step.title || '');
  const [description, setDescription] = useState(step.description || '');

  const buildStep = useCallback((u: string, t: string, desc: string): BrowserStep => {
    const newStep: BrowserStep = { browser: u };
    if (t) newStep.title = t;
    if (desc) newStep.description = desc;
    return newStep;
  }, []);

  useEffect(() => {
    setEditUrl(getBrowserUrl(step));
    setTitle(step.title || '');
    setDescription(step.description || '');
  }, [step]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-xs font-medium rounded">BROWSER</span>
          </div>
          {onDelete && (
            <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Delete step">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
        <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); onChange(buildStep(editUrl, e.target.value, description)); }} placeholder="Title (optional)"
          className="w-full px-3 py-1.5 mb-2 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
      </div>
      <div className="flex-1 p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">URL</label>
          <input type="text" value={editUrl} onChange={(e) => { setEditUrl(e.target.value); onChange(buildStep(e.target.value, title, description)); }} placeholder="https://example.com"
            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Description (optional)</label>
          <input type="text" value={description} onChange={(e) => { setDescription(e.target.value); onChange(buildStep(editUrl, title, e.target.value)); }} placeholder="Navigate to..."
            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
      </div>
    </div>
  );
}

// Assert Step Editor
interface AssertStepEditorProps {
  step: AssertStep | ExplicitAssertStep;
  onChange: (step: StepOrGroup) => void;
  onDelete?: () => void;
}

function AssertStepEditor({ step, onChange, onDelete }: AssertStepEditorProps) {
  const condition = getAssertCondition(step);
  const [editCondition, setEditCondition] = useState(condition);
  const [title, setTitle] = useState(step.title || '');
  const [message, setMessage] = useState(step.message || '');

  const buildStep = useCallback((cond: string, t: string, msg: string): AssertStep => {
    const newStep: AssertStep = { assert: cond };
    if (t) newStep.title = t;
    if (msg) newStep.message = msg;
    return newStep;
  }, []);

  useEffect(() => {
    setEditCondition(getAssertCondition(step));
    setTitle(step.title || '');
    setMessage(step.message || '');
  }, [step]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded">ASSERT</span>
          </div>
          {onDelete && (
            <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Delete step">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
        <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); onChange(buildStep(editCondition, e.target.value, message)); }} placeholder="Title (optional)"
          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
      </div>
      <div className="flex-1 p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Condition</label>
          <input type="text" value={editCondition} onChange={(e) => { setEditCondition(e.target.value); onChange(buildStep(e.target.value, title, message)); }} placeholder="$variable == 'expected'"
            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Message (optional)</label>
          <input type="text" value={message} onChange={(e) => { setMessage(e.target.value); onChange(buildStep(editCondition, title, e.target.value)); }} placeholder="Assertion message"
            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
      </div>
    </div>
  );
}

// Database Step Editor
interface DatabaseStepEditorProps {
  step: DatabaseStep | ExplicitDatabaseStep;
  onChange: (step: StepOrGroup) => void;
  onDelete?: () => void;
}

function DatabaseStepEditor({ step, onChange, onDelete }: DatabaseStepEditorProps) {
  const operation = getDatabaseOperation(step);
  const [editOperation, setEditOperation] = useState(operation);
  const [title, setTitle] = useState(step.title || '');
  const [dbType, setDbType] = useState<'mongodb' | 'postgres' | 'mysql'>(step.type || 'mongodb');
  const [collection, setCollection] = useState(step.collection || step.table || '');

  const buildStep = useCallback((op: string, t: string, type: string, coll: string): DatabaseStep => {
    const newStep: DatabaseStep = { db: op };
    if (t) newStep.title = t;
    if (type) newStep.type = type as 'mongodb' | 'postgres' | 'mysql';
    if (coll) {
      if (type === 'mongodb') newStep.collection = coll;
      else newStep.table = coll;
    }
    return newStep;
  }, []);

  useEffect(() => {
    setEditOperation(getDatabaseOperation(step));
    setTitle(step.title || '');
    setDbType(step.type || 'mongodb');
    setCollection(step.collection || step.table || '');
  }, [step]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-medium rounded">DATABASE</span>
          </div>
          {onDelete && (
            <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Delete step">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
        <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); onChange(buildStep(editOperation, e.target.value, dbType, collection)); }} placeholder="Title (optional)"
          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
      </div>
      <div className="flex-1 p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Operation</label>
          <input type="text" value={editOperation} onChange={(e) => { setEditOperation(e.target.value); onChange(buildStep(e.target.value, title, dbType, collection)); }} placeholder="find, insert, update, delete"
            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Type</label>
            <select value={dbType} onChange={(e) => { const v = e.target.value as 'mongodb' | 'postgres' | 'mysql'; setDbType(v); onChange(buildStep(editOperation, title, v, collection)); }}
              className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="mongodb">MongoDB</option>
              <option value="postgres">PostgreSQL</option>
              <option value="mysql">MySQL</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">{dbType === 'mongodb' ? 'Collection' : 'Table'}</label>
            <input type="text" value={collection} onChange={(e) => { setCollection(e.target.value); onChange(buildStep(editOperation, title, dbType, e.target.value)); }} placeholder={dbType === 'mongodb' ? 'users' : 'users_table'}
              className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Form Step Editor
interface FormStepEditorProps {
  step: FormStep | ExplicitFormStep;
  onChange: (step: StepOrGroup) => void;
  onDelete?: () => void;
}

function FormStepEditor({ step, onChange, onDelete }: FormStepEditorProps) {
  const [title, setTitle] = useState(getFormTitle(step));
  const [description, setDescription] = useState(step.description || '');
  const [submitLabel, setSubmitLabel] = useState(step.submit_label || 'Continue');
  const [fields, setFields] = useState<FormField[]>(step.fields || []);

  const buildStep = useCallback((t: string, desc: string, label: string, f: FormField[]): FormStep => {
    const newStep: FormStep = { form: t, fields: f };
    if (desc) newStep.description = desc;
    if (label && label !== 'Continue') newStep.submit_label = label;
    return newStep;
  }, []);

  useEffect(() => {
    setTitle(getFormTitle(step));
    setDescription(step.description || '');
    setSubmitLabel(step.submit_label || 'Continue');
    setFields(step.fields || []);
  }, [step]);

  const addField = () => {
    const newField: FormField = { name: `field${fields.length + 1}`, label: `Field ${fields.length + 1}`, type: 'text' };
    const updated = [...fields, newField];
    setFields(updated);
    onChange(buildStep(title, description, submitLabel, updated));
  };

  const updateField = (idx: number, field: FormField) => {
    const updated = [...fields];
    updated[idx] = field;
    setFields(updated);
    onChange(buildStep(title, description, submitLabel, updated));
  };

  const removeField = (idx: number) => {
    const updated = fields.filter((_, i) => i !== idx);
    setFields(updated);
    onChange(buildStep(title, description, submitLabel, updated));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded">FORM</span>
          </div>
          {onDelete && (
            <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Delete step">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
        <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); onChange(buildStep(e.target.value, description, submitLabel, fields)); }} placeholder="Form Title"
          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Description (optional)</label>
          <input type="text" value={description} onChange={(e) => { setDescription(e.target.value); onChange(buildStep(title, e.target.value, submitLabel, fields)); }} placeholder="Instructions for the user"
            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Submit Button Label</label>
          <input type="text" value={submitLabel} onChange={(e) => { setSubmitLabel(e.target.value); onChange(buildStep(title, description, e.target.value, fields)); }} placeholder="Continue"
            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400">Fields</label>
            <button onClick={addField} className="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-900/50">
              + Add Field
            </button>
          </div>
          <div className="space-y-2">
            {fields.map((field, idx) => (
              <div key={idx} className="p-2 bg-gray-50 dark:bg-slate-800/50 rounded border border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <input type="text" value={field.name} onChange={(e) => updateField(idx, { ...field, name: e.target.value })} placeholder="name"
                    className="flex-1 px-2 py-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs font-mono" />
                  <select value={field.type || 'text'} onChange={(e) => updateField(idx, { ...field, type: e.target.value as FormField['type'] })}
                    className="px-2 py-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="textarea">Textarea</option>
                    <option value="select">Select</option>
                    <option value="toggle">Toggle</option>
                    <option value="slider">Slider</option>
                  </select>
                  <button onClick={() => removeField(idx)} className="p-1 text-gray-400 hover:text-red-500">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <input type="text" value={field.label || ''} onChange={(e) => updateField(idx, { ...field, label: e.target.value })} placeholder="Label"
                  className="w-full px-2 py-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Terminal Step Editor
interface TerminalStepEditorProps {
  step: TerminalStep | ExplicitTerminalStep;
  onChange: (step: StepOrGroup) => void;
  onDelete?: () => void;
}

function TerminalStepEditor({ step, onChange, onDelete }: TerminalStepEditorProps) {
  const [content, setContent] = useState(getTerminalContent(step));
  const [title, setTitle] = useState(step.title || '');
  const [typingSpeed, setTypingSpeed] = useState(step.typing_speed || 30);
  const [prompt, setPrompt] = useState(step.prompt || '$');

  const buildStep = useCallback((c: string, t: string, speed: number, p: string): TerminalStep => {
    const newStep: TerminalStep = { terminal: c };
    if (t) newStep.title = t;
    if (speed !== 30) newStep.typing_speed = speed;
    if (p !== '$') newStep.prompt = p;
    return newStep;
  }, []);

  useEffect(() => {
    setContent(getTerminalContent(step));
    setTitle(step.title || '');
    setTypingSpeed(step.typing_speed || 30);
    setPrompt(step.prompt || '$');
  }, [step]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded">TERMINAL</span>
          </div>
          {onDelete && (
            <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Delete step">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
        <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); onChange(buildStep(content, e.target.value, typingSpeed, prompt)); }} placeholder="Title (optional)"
          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Terminal Content</label>
          <textarea value={content} onChange={(e) => { setContent(e.target.value); onChange(buildStep(e.target.value, title, typingSpeed, prompt)); }}
            placeholder="$ npm install&#10;added 42 packages&#10;$ npm run build"
            rows={8}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono text-green-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y" />
          <p className="text-xs text-gray-400 mt-1">Lines starting with prompt ($ by default) are typed. Other lines appear as output.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Typing Speed (ms)</label>
            <input type="number" value={typingSpeed} onChange={(e) => { const v = parseInt(e.target.value) || 30; setTypingSpeed(v); onChange(buildStep(content, title, v, prompt)); }} min={1} max={500}
              className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Prompt</label>
            <input type="text" value={prompt} onChange={(e) => { setPrompt(e.target.value); onChange(buildStep(content, title, typingSpeed, e.target.value)); }} placeholder="$"
              className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Poll Step Editor
interface PollStepEditorProps {
  step: PollStep | ExplicitPollStep;
  onChange: (step: StepOrGroup) => void;
  onDelete?: () => void;
}

function PollStepEditor({ step, onChange, onDelete }: PollStepEditorProps) {
  const [endpoint, setEndpoint] = useState(getPollEndpoint(step));
  const [title, setTitle] = useState(step.title || '');
  const [successWhen, setSuccessWhen] = useState(step.success_when || '');
  const [failureWhen, setFailureWhen] = useState(step.failure_when || '');
  const [interval, setInterval] = useState(step.interval || 2000);
  const [maxAttempts, setMaxAttempts] = useState(step.max_attempts || 30);

  const buildStep = useCallback((ep: string, t: string, success: string, failure: string, int: number, max: number): PollStep => {
    const newStep: PollStep = { poll: ep, success_when: success };
    if (t) newStep.title = t;
    if (failure) newStep.failure_when = failure;
    if (int !== 2000) newStep.interval = int;
    if (max !== 30) newStep.max_attempts = max;
    return newStep;
  }, []);

  useEffect(() => {
    setEndpoint(getPollEndpoint(step));
    setTitle(step.title || '');
    setSuccessWhen(step.success_when || '');
    setFailureWhen(step.failure_when || '');
    setInterval(step.interval || 2000);
    setMaxAttempts(step.max_attempts || 30);
  }, [step]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium rounded">POLL</span>
          </div>
          {onDelete && (
            <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Delete step">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
        <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); onChange(buildStep(endpoint, e.target.value, successWhen, failureWhen, interval, maxAttempts)); }} placeholder="Title (optional)"
          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
      </div>
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Endpoint</label>
          <input type="text" value={endpoint} onChange={(e) => { setEndpoint(e.target.value); onChange(buildStep(e.target.value, title, successWhen, failureWhen, interval, maxAttempts)); }} placeholder="/jobs/$jobId/status"
            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Success Condition</label>
          <input type="text" value={successWhen} onChange={(e) => { setSuccessWhen(e.target.value); onChange(buildStep(endpoint, title, e.target.value, failureWhen, interval, maxAttempts)); }} placeholder="status == 'complete'"
            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Failure Condition (optional)</label>
          <input type="text" value={failureWhen} onChange={(e) => { setFailureWhen(e.target.value); onChange(buildStep(endpoint, title, successWhen, e.target.value, interval, maxAttempts)); }} placeholder="status == 'failed'"
            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Interval (ms)</label>
            <input type="number" value={interval} onChange={(e) => { const v = parseInt(e.target.value) || 2000; setInterval(v); onChange(buildStep(endpoint, title, successWhen, failureWhen, v, maxAttempts)); }} min={100}
              className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Max Attempts</label>
            <input type="number" value={maxAttempts} onChange={(e) => { const v = parseInt(e.target.value) || 30; setMaxAttempts(v); onChange(buildStep(endpoint, title, successWhen, failureWhen, interval, v)); }} min={1}
              className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
