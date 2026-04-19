<script lang="ts">
  import AppModal from "$/components/basic/AppModal.svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { spoolmanConfig } from "$/stores";
  import type { SpoolmanSpool } from "$/types";
  import { tr as i18nTr } from "$/utils/i18n";
  import { fetchSpoolmanSpools, getFilamentLabel, getFilamentMaterial } from "$/utils/spoolman";

  type SortKey = "id" | "filament" | "material";

  interface Props {
    active: boolean;
    selectedSpools: SpoolmanSpool[];
    onApply: (spools: SpoolmanSpool[]) => void;
  }

  let { active, selectedSpools, onApply }: Props = $props();

  let show = $state<boolean>(false);
  let loading = $state<boolean>(false);
  let loadingError = $state<string>("");
  let spools = $state<SpoolmanSpool[]>([]);
  let filterText = $state<string>("");
  let showArchived = $state<boolean>(false);
  let sortKey = $state<SortKey>("id");
  let sortDir = $state<1 | -1>(1);
  let selectedIds = $state<number[]>([]);

  const openModal = () => {
    selectedIds = selectedSpools.map((spool) => spool.id);
    show = true;

    if (spools.length === 0) {
      refreshSpools();
    }
  };

  const onClose = () => {
    loadingError = "";
  };

  const refreshSpools = async () => {
    loadingError = "";

    if (!$spoolmanConfig.baseUrl.trim()) {
      loadingError = $i18nTr("params.spoolman.error.base_url_required");
      return;
    }

    loading = true;

    try {
      const loaded = await fetchSpoolmanSpools({
        baseUrl: $spoolmanConfig.baseUrl,
        headerName: $spoolmanConfig.headerName,
        headerValue: $spoolmanConfig.headerValue,
      });

      const validIds = loaded.map((spool) => spool.id);
      selectedIds = selectedIds.filter((id) => validIds.includes(id));
      spools = loaded;
    } catch (e) {
      loadingError = `${e}`;
    } finally {
      loading = false;
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      sortDir = sortDir > 0 ? -1 : 1;
      return;
    }

    sortKey = key;
    sortDir = 1;
  };

  const rowTextForFilter = (spool: SpoolmanSpool): string => {
    return [String(spool.id), getFilamentLabel(spool), getFilamentMaterial(spool)].join(" ").toLowerCase();
  };

  const visibleSpools = $derived.by(() => {
    const normalizedFilter = filterText.trim().toLowerCase();

    const filtered = spools.filter((spool) => {
      if (!showArchived && spool.archived) {
        return false;
      }

      if (!normalizedFilter) {
        return true;
      }

      return rowTextForFilter(spool).includes(normalizedFilter);
    });

    filtered.sort((a, b) => {
      if (sortKey === "id") {
        return (a.id - b.id) * sortDir;
      }

      const left = sortKey === "filament" ? getFilamentLabel(a) : getFilamentMaterial(a);
      const right = sortKey === "filament" ? getFilamentLabel(b) : getFilamentMaterial(b);

      return left.localeCompare(right, undefined, { sensitivity: "base" }) * sortDir;
    });

    return filtered;
  });

  const selectedCount = $derived(selectedIds.length);
  const allVisibleSelected = $derived.by(
    () => visibleSpools.length > 0 && visibleSpools.every((spool) => selectedIds.includes(spool.id)),
  );

  const toggleRowSelection = (spoolId: number, checked: boolean) => {
    if (checked) {
      if (!selectedIds.includes(spoolId)) {
        selectedIds = [...selectedIds, spoolId];
      }
      return;
    }

    selectedIds = selectedIds.filter((id) => id !== spoolId);
  };

  const toggleAllVisible = (checked: boolean) => {
    if (checked) {
      const visibleIds = visibleSpools.map((spool) => spool.id);
      const merged = [...selectedIds];

      for (const id of visibleIds) {
        if (!merged.includes(id)) {
          merged.push(id);
        }
      }

      selectedIds = merged;
      return;
    }

    const hiddenVisibleIds = visibleSpools.map((spool) => spool.id);
    selectedIds = selectedIds.filter((id) => !hiddenVisibleIds.includes(id));
  };

  const applySelection = () => {
    const selected = spools.filter((spool) => selectedIds.includes(spool.id));
    onApply(selected);
    show = false;
  };

  const sortMark = (key: SortKey): string => {
    if (sortKey !== key) {
      return "";
    }
    return sortDir > 0 ? " ▲" : " ▼";
  };
</script>

<button
  class="btn btn-sm btn-{active ? 'warning' : 'secondary'}"
  data-bs-auto-close="outside"
  title={$i18nTr("params.spoolman.title")}
  onclick={openModal}>
  <div class="svg-icon spoolman"></div>
</button>

{#if show}
  <AppModal title={$i18nTr("params.spoolman.title")} onClose={onClose} bind:show>
    <div class="mb-3">
      <label class="form-label mb-1" for="spoolman-base-url">{$i18nTr("params.spoolman.base_url")}</label>
      <input id="spoolman-base-url" class="form-control form-control-sm" type="text" bind:value={$spoolmanConfig.baseUrl} />
    </div>

    <div class="row g-2 mb-3">
      <div class="col">
        <label class="form-label mb-1" for="spoolman-header-name">{$i18nTr("params.spoolman.header_name")}</label>
        <input
          id="spoolman-header-name"
          class="form-control form-control-sm"
          type="text"
          bind:value={$spoolmanConfig.headerName} />
      </div>
      <div class="col">
        <label class="form-label mb-1" for="spoolman-header-value">{$i18nTr("params.spoolman.header_value")}</label>
        <input
          id="spoolman-header-value"
          class="form-control form-control-sm"
          type="password"
          bind:value={$spoolmanConfig.headerValue} />
      </div>
      <div class="col-auto d-flex align-items-end">
        <button class="btn btn-sm btn-primary" onclick={refreshSpools} disabled={loading}>
          <MdIcon icon="refresh" />
          {$i18nTr("params.spoolman.fetch")}
        </button>
      </div>
    </div>

    {#if loadingError}
      <div class="alert alert-danger py-2 mb-3">{loadingError}</div>
    {/if}

    <div class="table-controls mb-2">
      <input
        class="form-control form-control-sm"
        type="text"
        placeholder={$i18nTr("params.spoolman.filter")}
        bind:value={filterText} />
      <div class="form-check ms-2">
        <input class="form-check-input" id="show-archived" type="checkbox" bind:checked={showArchived} />
        <label class="form-check-label" for="show-archived">{$i18nTr("params.spoolman.show_archived")}</label>
      </div>
    </div>

    <div class="table-wrapper">
      <table class="table table-sm table-hover align-middle mb-0">
        <thead class="table-light sticky-top">
          <tr>
            <th scope="col" class="sel-col">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                disabled={visibleSpools.length === 0}
                onchange={(e) => toggleAllVisible((e.target as HTMLInputElement).checked)} />
            </th>
            <th scope="col">
              <button class="btn btn-link p-0 text-decoration-none" onclick={() => toggleSort("id")}>
                {$i18nTr("params.spoolman.id")}{sortMark("id")}
              </button>
            </th>
            <th scope="col">
              <button class="btn btn-link p-0 text-decoration-none" onclick={() => toggleSort("filament")}>
                {$i18nTr("params.spoolman.filament")}{sortMark("filament")}
              </button>
            </th>
            <th scope="col">
              <button class="btn btn-link p-0 text-decoration-none" onclick={() => toggleSort("material")}>
                {$i18nTr("params.spoolman.material")}{sortMark("material")}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {#if visibleSpools.length === 0}
            <tr>
              <td colspan="4" class="text-center text-secondary py-4">{$i18nTr("params.spoolman.no_rows")}</td>
            </tr>
          {:else}
            {#each visibleSpools as spool (spool.id)}
              <tr>
                <td class="sel-col">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(spool.id)}
                    onchange={(e) => toggleRowSelection(spool.id, (e.target as HTMLInputElement).checked)} />
                </td>
                <td>{spool.id}</td>
                <td>{getFilamentLabel(spool)}</td>
                <td>{getFilamentMaterial(spool)}</td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>

    <div class="selected-counter text-end text-secondary mb-3">
      {$i18nTr("params.spoolman.selected")}: <strong>{selectedCount}</strong>
    </div>

    {#snippet footer()}
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">{$i18nTr("preview.close")}</button>
      <button type="button" class="btn btn-primary" onclick={applySelection}>
        {$i18nTr("params.spoolman.apply")}
      </button>
    {/snippet}
  </AppModal>
{/if}

<style>
  .table-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .table-wrapper {
    max-height: 320px;
    overflow: auto;
    border: 1px solid var(--bs-border-color);
    border-radius: 0.35rem;
    background: var(--bs-body-bg);
  }

  .sel-col {
    width: 2rem;
  }

  .selected-counter {
    font-size: 0.9rem;
  }

  .svg-icon {
    height: 1.5em;
    width: 1.5em;
    background-size: cover;
  }

  .spoolman.svg-icon {
    background-image: url("../assets/spoolman.svg");
  }
</style>
