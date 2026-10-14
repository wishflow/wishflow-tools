import type { PlantDefinition } from '../core/types';

export interface SeedChooserOptions {
  plants: PlantDefinition[];
  selectedPlantIds: string[];
  maxSelection: number;
  nameFor: (plant: PlantDefinition) => string;
  costLabel: (cost: number) => string;
  onToggle: (plantId: string) => void;
}

function createSeedButton(
  plant: PlantDefinition,
  selected: boolean,
  disabled: boolean,
  options: SeedChooserOptions,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'seed-choice' + (selected ? ' selected' : '');
  button.dataset.plantId = plant.id;
  button.setAttribute('aria-pressed', String(selected));
  button.setAttribute('aria-label', options.nameFor(plant) + ', ' + options.costLabel(plant.cost));
  button.disabled = disabled;

  const art = document.createElement('span');
  art.className = 'seed-art seed-' + plant.id;
  art.setAttribute('aria-hidden', 'true');
  const name = document.createElement('span');
  name.className = 'seed-name';
  name.textContent = options.nameFor(plant);
  const cost = document.createElement('span');
  cost.className = 'seed-cost';
  cost.textContent = '✦ ' + plant.cost;
  button.append(art, name, cost);
  button.addEventListener('click', () => options.onToggle(plant.id));
  return button;
}

export function renderSeedChooser(
  availableContainer: HTMLElement,
  selectedContainer: HTMLElement,
  options: SeedChooserOptions,
): void {
  const selectedIds = new Set(options.selectedPlantIds);
  const selectionFull = selectedIds.size >= options.maxSelection;
  availableContainer.replaceChildren();
  selectedContainer.replaceChildren();

  for (const plant of options.plants) {
    const selected = selectedIds.has(plant.id);
    availableContainer.append(createSeedButton(plant, selected, !selected && selectionFull, options));
    if (selected) selectedContainer.append(createSeedButton(plant, true, false, options));
  }
}
