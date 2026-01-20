<script setup lang="ts">
import type {Organization, Member} from '~~/types';

definePageMeta({
  layout: 'app',
  middleware: 'auth',
});

const organization = ref<Organization | null>(null);
const members = ref<Member[]>([]);
const isLoading = ref(true);
const isInviteModalOpen = ref(false);
const inviteEmail = ref('');
const isInviting = ref(false);
const inviteError = ref('');
const currentUserId = ref<string | null>(null);
const isDeleteModalOpen = ref(false);
const isDeleting = ref(false);
const deleteConfirmation = ref('');

const {user} = useAuth();

async function fetchOrganizationData() {
  try {
    const orgId = useCookie('currentOrgId')?.value;
    if (!orgId) {
      throw new Error('No organization selected');
    }

    const [orgResponse, membersResponse] = await Promise.all([
      $fetch<{ organization: Organization }>(`/api/organization/${orgId}`),
      $fetch<{ members: Member[] }>(`/api/organization/${orgId}/members`),
    ]);

    organization.value = orgResponse.organization;
    members.value = membersResponse.members;
    currentUserId.value = user.value?.id || null;
  } catch (error) {
    console.error('Failed to fetch organization data:', error);
  } finally {
    isLoading.value = false;
  }
}

async function inviteMember() {
  if (!inviteEmail.value || !inviteEmail.value.includes('@')) {
    inviteError.value = 'Please enter a valid email address';
    return;
  }

  isInviting.value = true;
  inviteError.value = '';

  try {
    const orgId = useCookie('currentOrgId')?.value;
    await $fetch(`/api/organization/${orgId}/invite`, {
      method: 'POST',
      body: {email: inviteEmail.value},
    });

    isInviteModalOpen.value = false;
    inviteEmail.value = '';
    await fetchOrganizationData();
  } catch (error: any) {
    inviteError.value = error.data?.message || 'Failed to send invitation';
  } finally {
    isInviting.value = false;
  }
}

async function removeMember(userId: string) {
  if (!confirm('Are you sure you want to remove this member?')) return;

  try {
    const orgId = useCookie('currentOrgId')?.value;
    await $fetch(`/api/organization/${orgId}/members/${userId}`, {
      method: 'DELETE',
    });
    await fetchOrganizationData();
  } catch (error) {
    console.error('Failed to remove member:', error);
  }
}

async function updateMemberRole(memberId: string, newRole: string) {
  try {
    const orgId = useCookie('currentOrgId')?.value;
    await $fetch(`/api/organization/${orgId}/members/${memberId}`, {
      method: 'PATCH' as any,
      body: {role: newRole},
    });
    await fetchOrganizationData();
  } catch (error) {
    console.error('Failed to update member role:', error);
  }
}

function isOwner(member: Member): boolean {
  return member.role === 'owner';
}

function isCurrentUser(member: Member): boolean {
  return member.user.id === currentUserId.value;
}

function canManageMembers(): boolean {
  return organization.value?.role === 'owner';
}

async function deleteOrganization() {
  if (deleteConfirmation.value !== organization.value?.name) {
    return;
  }

  isDeleting.value = true;

  try {
    const orgId = useCookie('currentOrgId');
    await $fetch(`/api/organization/${orgId.value}`, {
      method: 'DELETE',
    });

    // Clear the current organization cookie
    orgId.value = null;

    // Navigate to dashboard, which will redirect to create org or switch org
    await navigateTo('/dashboard');
  } catch (error: any) {
    console.error('Failed to delete organization:', error);
    alert(error.data?.message || 'Failed to delete organization');
  } finally {
    isDeleting.value = false;
    isDeleteModalOpen.value = false;
    deleteConfirmation.value = '';
  }
}

onMounted(() => {
  fetchOrganizationData();
});
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Organization Settings</h1>
        <p class="text-base-content/60 mt-1">
          Manage your organization and members
        </p>
      </div>
      <button
          v-if="canManageMembers()"
          class="btn btn-primary gap-2"
          @click="isInviteModalOpen = true"
      >
        <Icon name="heroicons:user-plus" class="w-5 h-5"/>
        Invite Member
      </button>
    </div>

    <div v-if="isLoading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"/>
    </div>

    <template v-else-if="organization">
      <div class="card bg-base-100 border border-base-300">
        <div class="card-body">
          <h2 class="card-title">Organization Info</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label class="label">
                <span class="label-text text-base-content/60">Name</span>
              </label>
              <input
                  type="text"
                  :value="organization.name"
                  class="input input-bordered w-full"
                  disabled
              />
            </div>
            <div>
              <label class="label">
                <span class="label-text text-base-content/60">ID</span>
              </label>
              <input
                  type="text"
                  :value="organization.id"
                  class="input input-bordered w-full font-mono text-sm"
                  disabled
              />
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 border border-base-300">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h2 class="card-title">Members</h2>
            <span class="badge badge-ghost">{{ members.length }} members</span>
          </div>

          <div class="overflow-x-auto">
            <table class="table">
              <thead>
              <tr class="border-b border-base-300">
                <th class="text-xs font-medium text-base-content/60 uppercase tracking-wider py-3">
                  Member
                </th>
                <th class="text-xs font-medium text-base-content/60 uppercase tracking-wider py-3 w-32">
                  Role
                </th>
                <th class="text-xs font-medium text-base-content/60 uppercase tracking-wider py-3 w-24">
                  Actions
                </th>
              </tr>
              </thead>
              <tbody>
              <tr
                  v-for="member in members"
                  :key="member.id"
                  class="border-b border-base-200 hover:bg-base-200/50"
              >
                <td class="py-3">
                  <div class="flex items-center gap-3">
                    <div class="avatar placeholder">
                      <div
                          class="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center text-sm">
                        <img
                            v-if="member.user.image"
                            :src="member.user.image"
                            :alt="member.user.name"
                            class="w-full h-full rounded-full object-cover"
                        />
                        <span v-else>
                            {{ ((member.user.name || 'U')[0] || 'U').toUpperCase() }}
                          </span>
                      </div>
                    </div>
                    <div>
                      <p class="font-medium text-sm">
                        {{ member.user.name }}
                        <span v-if="isCurrentUser(member)" class="text-xs text-base-content/50 ml-1">(you)</span>
                      </p>
                      <p class="text-xs text-base-content/60">{{ member.user.email }}</p>
                    </div>
                  </div>
                </td>
                <td class="py-3">
                  <select
                      v-if="canManageMembers() && !isOwner(member)"
                      :value="member.role"
                      class="select select-bordered select-sm"
                      @change="(e) => updateMemberRole(member.id, (e.target as HTMLSelectElement).value)"
                  >
                    <option value="owner">Owner</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <span
                      v-else
                      class="badge badge-sm"
                      :class="{
                        'badge-primary': member.role === 'owner',
                        'badge-secondary': member.role === 'member',
                        'badge-ghost': member.role === 'viewer',
                      }"
                  >
                      {{ member.role }}
                    </span>
                </td>
                <td class="py-3">
                  <button
                      v-if="canManageMembers() && !isOwner(member)"
                      class="btn btn-ghost btn-xs btn-square text-error/70 hover:text-error"
                      title="Remove member"
                      @click="removeMember(member.user.id)"
                  >
                    <Icon name="heroicons:trash" class="w-4 h-4"/>
                  </button>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Danger Zone -->
      <div v-if="canManageMembers()" class="card bg-base-100 border border-error/50">
        <div class="card-body">
          <h2 class="card-title text-error">Danger Zone</h2>
          <p class="text-base-content/60 text-sm mt-2">
            Once you delete an organization, there is no going back. Please be certain.
          </p>
          <div class="mt-4">
            <button
                class="btn btn-error btn-outline"
                @click="isDeleteModalOpen = true"
            >
              <Icon name="heroicons:trash" class="w-5 h-5"/>
              Delete Organization
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Delete Organization Modal -->
    <dialog :class="{ 'modal-open': isDeleteModalOpen }" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg text-error mb-4">Delete Organization</h3>
        <div class="space-y-4">
          <p class="text-base-content/80">
            This action <strong>cannot be undone</strong>. This will permanently delete the
            <strong>{{ organization?.name }}</strong> organization, including:
          </p>
          <ul class="list-disc list-inside text-base-content/60 text-sm space-y-1">
            <li>All organization members ({{ members.length }} members)</li>
            <li>All documents and files</li>
            <li>All tags</li>
          </ul>
          <div class="form-control">
            <label class="label">
              <span class="label-text">
                Please type <strong class="font-mono">{{ organization?.name }}</strong> to confirm
              </span>
            </label>
            <input
                v-model="deleteConfirmation"
                type="text"
                :placeholder="organization?.name"
                class="input input-bordered w-full"
                @keydown.enter="deleteOrganization"
            />
          </div>
        </div>
        <div class="modal-action">
          <button
              class="btn btn-ghost"
              @click="isDeleteModalOpen = false; deleteConfirmation = ''"
          >
            Cancel
          </button>
          <button
              class="btn btn-error"
              :disabled="isDeleting || deleteConfirmation !== organization?.name"
              @click="deleteOrganization"
          >
            <span v-if="isDeleting" class="loading loading-spinner loading-sm"/>
            Delete Organization
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="isDeleteModalOpen = false; deleteConfirmation = ''">close</button>
      </form>
    </dialog>

    <dialog :class="{ 'modal-open': isInviteModalOpen }" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Invite Member</h3>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Email address</span>
          </label>
          <input
              v-model="inviteEmail"
              type="email"
              placeholder="colleague@example.com"
              class="input input-bordered w-full"
              :class="{ 'input-error': inviteError }"
              @keydown.enter="inviteMember"
          />
          <label v-if="inviteError" class="label">
            <span class="label-text-alt text-error">{{ inviteError }}</span>
          </label>
        </div>
        <div class="modal-action">
          <button class="btn btn-ghost" @click="isInviteModalOpen = false">
            Cancel
          </button>
          <button
              class="btn btn-primary"
              :disabled="isInviting"
              @click="inviteMember"
          >
            <span v-if="isInviting" class="loading loading-spinner loading-sm"/>
            Send Invitation
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="isInviteModalOpen = false">close</button>
      </form>
    </dialog>
  </div>
</template>
