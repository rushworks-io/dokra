<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: ['auth'],
});

const name = ref('');
const slug = ref('');
const isCustomSlug = ref(false);
const isSubmitting = ref(false);
const error = ref('');

// Auto-generate slug from name
watch(name, (newName) => {
  if (!isCustomSlug.value) {
    slug.value = generateSlug(newName);
  }
});

function generateSlug(input: string): string {
  return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
}

function onSlugInput() {
  isCustomSlug.value = true;
}

async function createOrganization() {
  if (!name.value.trim()) {
    error.value = 'Organization name is required';
    return;
  }

  isSubmitting.value = true;
  error.value = '';

  try {
    const response = await $fetch<{ organization: { id: string } }>('/api/orgs', {
      method: 'POST',
      body: {
        name: name.value.trim(),
        slug: slug.value || undefined,
      },
    });

    // Set the new organization as current
    const orgIdCookie = useCookie('currentOrgId');
    orgIdCookie.value = response.organization.id;

    // Navigate to dashboard
    await navigateTo('/dashboard');
  } catch (err: any) {
    error.value = err.data?.message || 'Failed to create organization';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold">Create Organization</h1>
        <p class="text-base-content/60 mt-2">
          Set up a new workspace for your team
        </p>
      </div>

      <div class="card bg-base-100 border border-base-300">
        <div class="card-body">
          <form @submit.prevent="createOrganization" class="space-y-4">
            <div>
              <label class="label">
                <span class="label-text">Organization Name</span>
              </label>
              <input
                  v-model="name"
                  type="text"
                  placeholder="My Organization"
                  class="input input-bordered w-full"
                  :disabled="isSubmitting"
              />
            </div>

            <div>
              <label class="label">
                <span class="label-text">Slug</span>
                <span class="label-text-alt text-base-content/50">URL identifier</span>
              </label>
              <input
                  v-model="slug"
                  type="text"
                  placeholder="my-organization"
                  class="input input-bordered w-full font-mono text-sm"
                  :disabled="isSubmitting"
                  @input="onSlugInput"
              />
              <label class="label">
                <span class="label-text-alt text-base-content/50">
                  Only lowercase letters, numbers, and hyphens
                </span>
              </label>
            </div>

            <div v-if="error" class="alert alert-error">
              <Icon name="heroicons:exclamation-circle" class="w-5 h-5"/>
              <span>{{ error }}</span>
            </div>

            <div class="flex gap-3 pt-2">
              <button
                  type="button"
                  class="btn btn-ghost flex-1"
                  :disabled="isSubmitting"
                  @click="navigateTo('/dashboard')"
              >
                Cancel
              </button>
              <button
                  type="submit"
                  class="btn btn-primary flex-1"
                  :disabled="isSubmitting || !name.trim()"
              >
                <span v-if="isSubmitting" class="loading loading-spinner loading-sm"/>
                <span v-else>Create Organization</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
