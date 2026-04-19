<script lang="ts">
  import { onDestroy } from "svelte";
  import type { JSONPath } from "immutable-json-patch";
  import {
    Mode,
    createJSONEditor,
    getSelectionPaths,
    type JSONEditorPropsOptional,
    type JSONEditorSelection,
    type MenuItem,
  } from "vanilla-jsoneditor";
  import { tr } from "$/utils/i18n";
  import { Toasts } from "$/utils/toasts";
  import { SPOOLMAN_SAMPLE_JSON } from "$/utils/spoolman_sample_json";

  let selectedJsonPath = $state<string>("");
  let editorHost = $state<HTMLDivElement>();
  let jsonEditor = $state<ReturnType<typeof createJSONEditor>>();

  const sampleContent = {
    json: SPOOLMAN_SAMPLE_JSON,
  };

  const toTemplatePath = (path: JSONPath): string => {
    let result = "";

    for (const item of path) {
      if (typeof item === "number") {
        result += `[${item}]`;
        continue;
      }

      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(item)) {
        result += result ? `.${item}` : item;
      } else {
        result += `[${JSON.stringify(item)}]`;
      }
    }

    return result;
  };

  const onJsonSelect = (selection: JSONEditorSelection | undefined) => {
    if (!selection || selection.type === "text") {
      selectedJsonPath = "";
      return;
    }

    const paths = getSelectionPaths(SPOOLMAN_SAMPLE_JSON, selection);
    if (paths.length === 0) {
      selectedJsonPath = "";
      return;
    }

    selectedJsonPath = toTemplatePath(paths[0]);
  };

  const fallbackCopyToClipboard = (text: string) => {
    const input = document.createElement("textarea");
    input.value = text;
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.focus();
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
  };

  const copySelectedPath = async () => {
    if (!selectedJsonPath) {
      Toasts.message($tr("params.spoolman.no_path_selected"));
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(selectedJsonPath);
      } else {
        fallbackCopyToClipboard(selectedJsonPath);
      }

      Toasts.message($tr("params.spoolman.key_copied"));
    } catch (e) {
      Toasts.error(e);
    }
  };

  const renderMenu = (): MenuItem[] => {
    return [
      {
        type: "button",
        text: $tr("params.spoolman.copy_key"),
        title: $tr("params.spoolman.copy_key"),
        disabled: selectedJsonPath.length === 0,
        onClick: () => copySelectedPath(),
      },
    ];
  };

  const syncJsonEditor = () => {
    if (!editorHost) {
      return;
    }

    const props: JSONEditorPropsOptional = {
      content: sampleContent,
      mode: Mode.tree,
      readOnly: true,
      navigationBar: false,
      statusBar: false,
      onSelect: onJsonSelect,
      onRenderMenu: () => renderMenu(),
      onRenderContextMenu: () => false,
    };

    if (!jsonEditor) {
      jsonEditor = createJSONEditor({
        target: editorHost,
        props,
      });
      return;
    }

    jsonEditor.updateProps(props);
  };

  const disposeJsonEditor = () => {
    if (jsonEditor) {
      void jsonEditor.destroy();
      jsonEditor = undefined;
    }
  };

  $effect(() => {
    syncJsonEditor();
  });

  onDestroy(() => {
    disposeJsonEditor();
  });
</script>

<div class="spoolman-sample mt-2">
  <div class="d-flex justify-content-between align-items-center mb-2">
    <div class="fw-semibold">{$tr("params.spoolman.sample_json")}</div>
    <div class="text-secondary sample-path">
      {#if selectedJsonPath}
        {selectedJsonPath}
      {:else}
        {$tr("params.spoolman.no_path_selected")}
      {/if}
    </div>
  </div>

  <div class="json-editor-host">
    <div class="json-editor-inner" bind:this={editorHost}></div>
  </div>
</div>

<style>
  .json-editor-host {
    height: 280px;
    border: 1px solid var(--bs-border-color);
    border-radius: 0.35rem;
    overflow: hidden;
    background: var(--bs-body-bg);
  }

  .json-editor-inner {
    width: 100%;
    height: 100%;
  }

  .sample-path {
    max-width: 60%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: monospace;
    font-size: 0.85rem;
  }
</style>
