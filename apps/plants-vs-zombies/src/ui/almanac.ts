import type { PlantDefinition, ZombieDefinition } from '../core/types';

export interface AlmanacIndex {
  plants: Array<{ id: string; name: string; detail: string }>;
  zombies: Array<{ id: string; name: string; detail: string }>;
}

export function createAlmanacIndex(
  plants: PlantDefinition[],
  zombies: ZombieDefinition[],
  localizeName: (name: string, nameZh?: string) => string,
  labels: { sun: string; health: string; armor: string; speed: string; ability: string },
): AlmanacIndex {
  return {
    plants: plants.map((plant) => ({
      id: plant.id,
      name: localizeName(plant.title, plant.titleZh),
      detail: [labels.sun + ' ' + plant.cost, labels.health + ' ' + plant.maxHealth, plant.ability ? labels.ability + ' ' + plant.ability : '']
        .filter(Boolean).join(' · '),
    })),
    zombies: zombies.map((zombie) => ({
      id: zombie.id,
      name: localizeName(zombie.title, zombie.titleZh),
      detail: [labels.health + ' ' + zombie.maxHealth, zombie.armorHealth ? labels.armor + ' ' + zombie.armorHealth : '', labels.speed + ' ' + zombie.speedPerTick]
        .filter(Boolean).join(' · '),
    })),
  };
}

export function renderAlmanac(container: HTMLElement, index: AlmanacIndex, messages: { plants: string; zombies: string }): void {
  container.replaceChildren();
  const sections = [
    { title: messages.plants, entries: index.plants },
    { title: messages.zombies, entries: index.zombies },
  ];
  for (const section of sections) {
    const group = document.createElement('section');
    group.className = 'almanac-section';
    const heading = document.createElement('h3');
    heading.textContent = section.title;
    const list = document.createElement('div');
    list.className = 'almanac-list';
    for (const entry of section.entries) {
      const card = document.createElement('article');
      card.className = 'almanac-card';
      card.dataset.entryId = entry.id;
      const title = document.createElement('h4');
      title.textContent = entry.name;
      const detail = document.createElement('p');
      detail.textContent = entry.detail;
      card.append(title, detail);
      list.append(card);
    }
    group.append(heading, list);
    container.append(group);
  }
}
