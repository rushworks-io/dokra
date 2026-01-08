<script setup lang="ts">
const route = useRoute();
const isCollapsed = ref(false);
const hoveredItem = ref<string | null>(null);
const expandedCategory = ref<string | null>(null);
const sidebarRef = ref<HTMLElement | null>(null);
const toggleY = ref<string>('50%');
const isSidebarHovered = ref(false);

const navigation = [
  {name: 'Home', href: '/dashboard', icon: 'heroicons:home'},
  {name: 'Documents', href: '/documents', icon: 'heroicons:document-duplicate'},
  {name: 'Tags', href: '/tags', icon: 'heroicons:tag'},
  {name: 'Members', href: '/members', icon: 'heroicons:users'},
  {name: 'Settings', href: '/settings/organization', icon: 'heroicons:cog-6-tooth'},
];

const settings = [
  {name: 'Settings', href: '/settings/organization', icon: 'heroicons:cog-6-tooth'},
];

function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value;
  localStorage.setItem('sidebarCollapsed', String(isCollapsed.value));
  if (isCollapsed.value) {
    expandedCategory.value = null;
  }
}

onMounted(() => {
  const saved = localStorage.getItem('sidebarCollapsed');
  if (saved !== null) {
    isCollapsed.value = saved === 'true';
  }
});

const isActive = (href: string) => {
  if (href === '/dashboard') {
    return route.path === '/dashboard' || route.path === '/';
  }
  return route.path.startsWith(href);
};

function handleMouseEnter(itemName: string) {
  if (isCollapsed.value) {
    hoveredItem.value = itemName;
  }
}

function handleMouseLeave() {
  hoveredItem.value = null;
}

function toggleCategory(category: string) {
  if (isCollapsed.value) {
    expandedCategory.value = expandedCategory.value === category ? null : category;
  }
}

function handleMouseMove(e: MouseEvent) {
  if (!sidebarRef.value) return;
  const rect = sidebarRef.value.getBoundingClientRect();
  const relativeY = e.clientY - rect.top;

  // Clamp values to keep button inside sidebar vertically
  const maxY = rect.height - 24; // minimal padding
  const minY = 24;
  const clampedY = Math.max(minY, Math.min(maxY, relativeY));

  toggleY.value = `${clampedY}px`;
  isSidebarHovered.value = true;
}

function handleMouseLeaveSidebar() {
  toggleY.value = '50%';
  isSidebarHovered.value = false;
}

const toggleStyle = computed(() => ({
  top: toggleY.value,
  transition: isSidebarHovered.value
      ? 'top 0.05s linear, opacity 0.2s ease, transform 0.1s ease'
      : 'top 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease, transform 0.2s ease',
  transform: 'translateY(-50%)' // Ensure vertical centering
}));

const sidebarWidth = computed(() => isCollapsed.value ? 'w-16' : 'w-48');
const sidebarContentWidth = computed(() => isCollapsed.value ? 'w-16' : 'w-48');
</script>

<template>
  <div class="flex h-full z-20">
    <aside
        class="group relative bg-base-100 border-r border-base-300 flex flex-col transition-all duration-300 ease-in-out shrink-0"
        :class="sidebarWidth"
        :aria-expanded="!isCollapsed"
        ref="sidebarRef"
        @mousemove="handleMouseMove"
        @mouseleave="handleMouseLeaveSidebar"
    >
      <button
          class="absolute left-full ml-3 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-base-300 bg-base-100 text-base-content/70 shadow-md transition-all duration-200 hover:bg-base-200 hover:text-primary focus:outline-none active:scale-95 opacity-0 group-hover:opacity-100 before:absolute before:right-full before:top-0 before:h-full before:w-4 before:content-['']"
          :class="{ 'opacity-100': isCollapsed }"
          @click="toggleSidebar"
          aria-label="Toggle Sidebar"
          :style="toggleStyle"
      >
        <Icon
            :name="isCollapsed ? 'heroicons:chevron-right' : 'heroicons:chevron-left'"
            class="h-6 w-6"
        />
      </button>

      <!-- Hover hint -->
      <div
          class="absolute -right-1 h-10 w-1 rounded-full bg-primary/50 transition-opacity duration-200 group-hover:opacity-0"
          :class="{ 'opacity-0': isCollapsed }"
          :style="toggleStyle"
      />

      <div
          class="flex flex-col h-full transition-all duration-300 ease-in-out"
          :class="sidebarContentWidth"
      >

        <nav class="flex-1 py-4">
          <ul class="menu gap-1 px-2 menu-md w-full">
            <li v-for="item in navigation" :key="item.name">
              <NuxtLink
                  :to="item.href"
                  class="flex items-center gap-3 px-3 py-3 rounded-lg transition-all relative group"
                  :class="[
                  isActive(item.href)
                    ? 'bg-base-200 font-medium'
                    : 'hover:bg-base-200/50 text-base-content/70',
                  isCollapsed ? 'justify-center' : 'justify-start'
                ]"
                  @mouseenter="handleMouseEnter(item.name)"
                  @mouseleave="handleMouseLeave"
              >
                <Icon :name="item.icon" class="w-6 h-6 shrink-0"/>
                <span
                    class="whitespace-nowrap overflow-hidden transition-all duration-300"
                    :class="isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'"
                >
                  {{ item.name }}
                </span>
                <div
                    v-if="isActive(item.href) && !isCollapsed"
                    class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r"
                />
                <div
                    v-if="isActive(item.href) && isCollapsed"
                    class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r -translate-x-1/2"
                />
                <Transition
                    enter-active-class="transition-all duration-200"
                    enter-from-class="opacity-0 -translate-x-2"
                    enter-to-class="opacity-100 translate-x-0"
                    leave-active-class="transition-all duration-150"
                    leave-from-class="opacity-100 translate-x-0"
                    leave-to-class="opacity-0 -translate-x-2"
                >
                  <div
                      v-if="isCollapsed && hoveredItem === item.name"
                      class="fixed left-16 z-50 bg-base-200 px-3 py-2 rounded-lg shadow-lg whitespace-nowrap text-sm font-medium"
                  >
                    {{ item.name }}
                  </div>
                </Transition>
              </NuxtLink>
            </li>
          </ul>
        </nav>

        <div class="p-2 border-t border-base-300">
          <div
              class="text-xs text-base-content/50 px-2 py-1 whitespace-nowrap overflow-hidden transition-all duration-300"
              :class="isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'"
          >
            Dokra v1.0
          </div>
        </div>
      </div>
    </aside>

    <Transition
        enter-active-class="transition-all duration-300 ease-in-out"
        enter-from-class="opacity-0 -translate-x-2"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition-all duration-300 ease-in-out"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 -translate-x-2"
    >
      <div
          v-if="isCollapsed && expandedCategory"
          class="fixed left-16 top-0 h-full bg-base-100 border-r border-base-300 shadow-xl z-40 py-4 overflow-y-auto"
          style="width: 12rem;"
      >
        <div class="px-2">
          <h3 class="text-xs font-medium text-base-content/50 uppercase tracking-wider px-3 mb-2">
            {{ expandedCategory }}
          </h3>
          <ul class="menu menu-sm gap-1">
            <li v-for="subItem in ['Subitem 1', 'Subitem 2', 'Subitem 3']" :key="subItem">
              <a class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-base-200">
                <span class="text-sm">{{ subItem }}</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </Transition>
  </div>
</template>
