<script setup lang="ts">
const props = defineProps<{
  src: string;
  fileName: string;
}>();

const emit = defineEmits<{
  close: [];
  download: [];
}>();

// Image state
const scale = ref(1);
const rotation = ref(0);
const position = reactive({x: 0, y: 0});
const isDragging = ref(false);
const dragStart = reactive({x: 0, y: 0});

// Zoom controls
function zoomIn() {
  scale.value = Math.min(scale.value + 0.25, 5);
}

function zoomOut() {
  scale.value = Math.max(scale.value - 0.25, 0.1);
}

function resetZoom() {
  scale.value = 1;
  rotation.value = 0;
  position.x = 0;
  position.y = 0;
}

// Rotation
function rotateLeft() {
  rotation.value -= 90;
}

function rotateRight() {
  rotation.value += 90;
}

// Pan functionality
function startDrag(e: MouseEvent) {
  if (scale.value <= 1) return; // Only allow dragging when zoomed
  isDragging.value = true;
  dragStart.x = e.clientX - position.x;
  dragStart.y = e.clientY - position.y;
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value) return;
  position.x = e.clientX - dragStart.x;
  position.y = e.clientY - dragStart.y;
}

function stopDrag() {
  isDragging.value = false;
}

// Touch support for mobile
let touchStartDistance = 0;
let initialScale = 1;

function handleTouchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    touchStartDistance = getTouchDistance(e.touches);
    initialScale = scale.value;
  }
}

function handleTouchMove(e: TouchEvent) {
  if (e.touches.length === 2) {
    e.preventDefault();
    const currentDistance = getTouchDistance(e.touches);
    const delta = currentDistance / touchStartDistance;
    scale.value = Math.max(0.1, Math.min(5, initialScale * delta));
  }
}

function getTouchDistance(touches: TouchList): number {
  if (touches[0] && touches[1]) {

    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  return 0
}

function handleTouchEnd() {
  touchStartDistance = 0;
  initialScale = 1;
}

// Computed styles for transform
const imageStyle = computed(() => ({
  transform: `scale(${scale.value}) rotate(${rotation.value}deg)`,
  cursor: isDragging.value ? 'grabbing' : scale.value > 1 ? 'grab' : 'default',
  maxWidth: scale.value > 1 ? 'none' : '100%',
  maxHeight: scale.value > 1 ? 'none' : '100%',
}));

// Keyboard navigation
function handleKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case '+':
    case '=':
      e.preventDefault();
      zoomIn();
      break;
    case '-':
      e.preventDefault();
      zoomOut();
      break;
    case '0':
      e.preventDefault();
      resetZoom();
      break;
    case 'r':
      e.preventDefault();
      resetZoom();
      break;
    case 'ArrowLeft':
      e.preventDefault();
      rotateLeft();
      break;
    case 'ArrowRight':
      e.preventDefault();
      rotateRight();
      break;
    case 'ArrowUp':
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        zoomIn();
      } else {
        position.y += 20;
      }
      break;
    case 'ArrowDown':
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        zoomOut();
      } else {
        position.y -= 20;
      }
      break;
    case 'Escape':
      e.preventDefault();
      emit('close');
      break;
    case 'd':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        emit('download');
      }
      break;
  }
}

// Focus the container on mount
const containerRef = ref<HTMLDivElement>();

onMounted(() => {
  containerRef.value?.focus();
});
</script>

<template>
  <div
      ref="containerRef"
      class="image-viewer fixed inset-0 bg-black/95 z-50 flex flex-col outline-none"
      tabindex="0"
      @keydown="handleKeydown"
  >
    <!-- Toolbar -->
    <div class="flex items-center justify-between p-4 bg-base-100/90 backdrop-blur-sm border-b border-base-300">
      <div class="flex items-center gap-4">
        <h3 class="font-medium truncate max-w-xs" :title="fileName">
          {{ fileName }}
        </h3>
      </div>

      <div class="flex items-center gap-2 flex-wrap justify-end">
        <!-- Zoom -->
        <div class="join">
          <button class="join-item btn btn-sm" @click="zoomOut" title="Zoom Out (-)">
            <Icon name="heroicons:magnifying-glass-minus" class="w-4 h-4"/>
          </button>
          <button class="join-item btn btn-sm px-3 min-w-[4rem] disabled:cursor-auto">
            {{ Math.round(scale * 100) }}%
          </button>
          <button class="join-item btn btn-sm" @click="zoomIn" title="Zoom In (+)">
            <Icon name="heroicons:magnifying-glass-plus" class="w-4 h-4"/>
          </button>
        </div>

        <button class="btn btn-sm btn-ghost" @click="resetZoom" title="Reset (0)">
          Reset
        </button>

        <div class="divider divider-horizontal mx-1 hidden sm:flex"></div>

        <!-- Rotate -->
        <button class="btn btn-sm btn-ghost" @click="rotateLeft" title="Rotate Left (←)">
          <Icon name="heroicons:arrow-uturn-left" class="w-4 h-4"/>
        </button>
        <button class="btn btn-sm btn-ghost" @click="rotateRight" title="Rotate Right (→)">
          <Icon name="heroicons:arrow-uturn-right" class="w-4 h-4"/>
        </button>

        <div class="divider divider-horizontal mx-1 hidden sm:flex"></div>

        <!-- Actions -->
        <button
            class="btn btn-sm btn-primary gap-2"
            @click="$emit('download')"
            title="Download (Ctrl+D)"
        >
          <Icon name="heroicons:arrow-down-tray" class="w-4 h-4"/>
          <span class="hidden sm:inline">Download</span>
        </button>
        <button
            class="btn btn-sm btn-ghost gap-2"
            @click="$emit('close')"
            title="Close (Esc)"
        >
          <Icon name="heroicons:x-mark" class="w-4 h-4"/>
          <span class="hidden sm:inline">Close</span>
        </button>
      </div>
    </div>

    <!-- Image Container -->
    <div
        class="flex-1 overflow-hidden flex items-center justify-center p-4 select-none"
        @mousedown="startDrag"
        @mousemove="onDrag"
        @mouseup="stopDrag"
        @mouseleave="stopDrag"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
    >
      <img
          :src="src"
          :style="imageStyle"
          class="max-w-full max-h-full object-contain transition-transform duration-75"
          draggable="false"
          alt="Document preview"
          @dragstart.prevent
      />
    </div>

    <!-- Instructions Footer -->
    <div class="bg-base-100/90 backdrop-blur-sm border-t border-base-300 p-2 text-center text-sm text-base-content/60">
      <span class="mx-2">Zoom: [+/-]</span>
      <span class="mx-2">Rotate: [←/→]</span>
      <span class="mx-2">Reset: [0]</span>
      <span class="mx-2">Close: [Esc]</span>
    </div>
  </div>
</template>
