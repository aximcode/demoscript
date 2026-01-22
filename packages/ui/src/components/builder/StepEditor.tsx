/**
 * StepEditor - Form-based step editing for Visual Builder
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
import {
  parseRestMethod,
  isRestStep,
  isSlideStep,
  isShellStep,
  isStepGroup,
  getSlideContent,
  getShellCommand,
  type RestStep,
  type ExplicitRestStep,
  type SlideStep,
  type ExplicitSlideStep,
  type ShellStep,
  type ExplicitShellStep,
  type StepOrGroup,
  type StepGroup,
} from '../../types/schema';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

interface StepEditorProps {
  step: StepOrGroup;
  onChange: (step: StepOrGroup) => void;
  onDelete?: () => void;
}

export function StepEditor({ step, onChange, onDelete }: StepEditorProps) {
  if (isStepGroup(step)) {
    return <GroupEditor step={step} onChange={onChange} onDelete={onDelete} />;
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
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Step title (optional)"
          className="w-full px-3 py-1.5 mb-2 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />

        {/* Description input */}
        <input
          type="text"
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Description (optional)"
          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
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

  const handleContentChange = useCallback((newContent: string) => {
    setEditContent(newContent);
    // Always use concise syntax for simplicity
    const newStep: SlideStep = { slide: newContent };
    if (step.title) newStep.title = step.title;
    onChange(newStep);
  }, [step.title, onChange]);

  // Sync when step changes externally
  useEffect(() => {
    setEditContent(getSlideContent(step));
  }, [step]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
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

// Group Editor (minimal for now)
interface GroupEditorProps {
  step: StepGroup;
  onChange: (step: StepOrGroup) => void;
  onDelete?: () => void;
}

function GroupEditor({ step, onChange, onDelete }: GroupEditorProps) {
  const [groupName, setGroupName] = useState(step.group);

  const handleNameChange = useCallback((name: string) => {
    setGroupName(name);
    onChange({ ...step, group: name });
  }, [step, onChange]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium rounded">
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

      <div className="flex-1 p-4">
        <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
          Group Name
        </label>
        <input
          type="text"
          value={groupName}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Group name"
          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
          This group contains {step.steps.length} step{step.steps.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
