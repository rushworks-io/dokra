<script setup lang="ts">
interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string;
}

const { user } = useAuth();
const profile = ref<UserProfile | null>(null);
const isLoading = ref(true);
const isSaving = ref(false);
const saveSuccess = ref(false);
const saveError = ref('');

const name = ref('');
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');

async function fetchUserProfile() {
  try {
    const response = await $fetch<{ user: UserProfile }>('/api/users/me');
    profile.value = response.user;
    name.value = response.user.name || '';
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
  } finally {
    isLoading.value = false;
  }
}

async function updateProfile() {
  isSaving.value = true;
  saveSuccess.value = false;
  saveError.value = '';

  try {
    await $fetch('/api/users/me', {
      method: 'PATCH',
      body: { name: name.value },
    });
    saveSuccess.value = true;
    setTimeout(() => {
      saveSuccess.value = false;
    }, 3000);
  } catch (error: any) {
    saveError.value = error.data?.message || 'Failed to update profile';
  } finally {
    isSaving.value = false;
  }
}

async function updatePassword() {
  if (newPassword.value !== confirmPassword.value) {
    saveError.value = 'Passwords do not match';
    return;
  }

  if (newPassword.value.length < 8) {
    saveError.value = 'Password must be at least 8 characters';
    return;
  }

  isSaving.value = true;
  saveSuccess.value = false;
  saveError.value = '';

  try {
    await $fetch('/api/users/me/password', {
      method: 'PATCH',
      body: {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      },
    });
    saveSuccess.value = true;
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    setTimeout(() => {
      saveSuccess.value = false;
    }, 3000);
  } catch (error: any) {
    saveError.value = error.data?.message || 'Failed to update password';
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => {
  fetchUserProfile();
});
</script>

<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-bold">Profile Settings</h1>
      <p class="text-base-content/60 mt-1">
        Manage your personal information and account settings
      </p>
    </div>

    <div v-if="isLoading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg" />
    </div>

    <template v-else-if="profile">
      <div class="card bg-base-100 border border-base-300">
        <div class="card-body">
          <h2 class="card-title">Profile Information</h2>

          <div class="flex items-center gap-4 mt-4">
            <div class="avatar placeholder">
              <div class="w-16 h-16 rounded-full bg-primary text-primary-content flex items-center justify-center text-xl font-medium">
                <img
                  v-if="profile.image"
                  :src="profile.image"
                  :alt="profile.name"
                  class="w-full h-full rounded-full object-cover"
                />
                <span v-else>{{ ((profile.name || 'U')[0] || 'U').toUpperCase() }}</span>
              </div>
            </div>
            <div>
              <p class="font-medium">{{ profile.name || 'Unnamed User' }}</p>
              <p class="text-sm text-base-content/60">{{ profile.email }}</p>
            </div>
          </div>

          <div class="divider" />

          <form @submit.prevent="updateProfile" class="space-y-4">
            <div class="alert alert-success" v-if="saveSuccess">
              <Icon name="heroicons:check-circle" class="w-5 h-5" />
              <span>Changes saved successfully</span>
            </div>

            <div class="alert alert-error" v-if="saveError">
              <Icon name="heroicons:x-circle" class="w-5 h-5" />
              <span>{{ saveError }}</span>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Full Name</span>
              </label>
              <input
                v-model="name"
                type="text"
                placeholder="Your name"
                class="input input-bordered w-full max-w-md"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Email Address</span>
              </label>
              <input
                type="email"
                :value="profile.email"
                class="input input-bordered w-full max-w-md"
                disabled
              />
              <label class="label">
                <span class="label-text-alt text-base-content/50">
                  Email cannot be changed
                </span>
              </label>
            </div>

            <div class="mt-4">
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="isSaving"
              >
                <span v-if="isSaving" class="loading loading-spinner loading-sm" />
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>

      <div class="card bg-base-100 border border-base-300">
        <div class="card-body">
          <h2 class="card-title">Change Password</h2>

          <form @submit.prevent="updatePassword" class="space-y-4 mt-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Current Password</span>
              </label>
              <input
                v-model="currentPassword"
                type="password"
                placeholder="Enter current password"
                class="input input-bordered w-full max-w-md"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">New Password</span>
              </label>
              <input
                v-model="newPassword"
                type="password"
                placeholder="Enter new password (min. 8 characters)"
                class="input input-bordered w-full max-w-md"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Confirm New Password</span>
              </label>
              <input
                v-model="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                class="input input-bordered w-full max-w-md"
              />
            </div>

            <div class="mt-4">
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="isSaving || !currentPassword || !newPassword"
              >
                <span v-if="isSaving" class="loading loading-spinner loading-sm" />
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>

      <div class="card bg-base-100 border border-base-300 border-error/30">
        <div class="card-body">
          <h2 class="card-title text-error">Danger Zone</h2>

          <div class="flex items-center justify-between mt-4">
            <div>
              <p class="font-medium">Delete Account</p>
              <p class="text-sm text-base-content/60">
                Permanently delete your account and all associated data
              </p>
            </div>
            <button class="btn btn-error btn-outline">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
