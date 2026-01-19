<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: ['auth'],
});

const name = ref('');
const isSubmitting = ref(false);
const error = ref('');

async function createOrganization() {
  if (!name.value.trim()) {
    error.value = 'Organization name is required';
    return;
  }

  isSubmitting.value = true;
  error.value = '';

  try {
    const response = await $fetch<{ organization: { id: string } }>('/api/organization', {
      method: 'POST',
      body: {
        name: name.value.trim(),
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
