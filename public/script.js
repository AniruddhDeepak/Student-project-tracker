async function request(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
const store = {
  list: () => request('/api/projects'),
  create: project => request('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(project) }),
  update: (id, project) => request(`/api/projects/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(project) }),
  remove: id => request(`/api/projects/${id}`, { method: 'DELETE' })
};
const form = document.querySelector('#project-form');
const nameInput = document.querySelector('#name');
const statusInput = document.querySelector('#status');
const list = document.querySelector('#project-list');
const empty = document.querySelector('#empty-state');
const message = document.querySelector('#message');
const saveButton = document.querySelector('#save-button');
const cancelButton = document.querySelector('#cancel-button');
let editingId = null;
let busy = false;
function tell(text, error = false) { message.textContent = text; message.dataset.error = String(error); }
function resetForm() {
  editingId = null;
  form.reset();
  saveButton.textContent = 'Add project';
  cancelButton.hidden = true;
  document.querySelector('#form-title').textContent = 'Add a project';
}
function setBusy(value) {
  busy = value;
  form.querySelectorAll('input, select, button').forEach(el => el.disabled = value);
  list.querySelectorAll('button').forEach(el => el.disabled = value);
}
async function refresh() {
  const rows = await store.list();
  list.replaceChildren();
  empty.hidden = rows.length > 0;
  for (const project of rows) {
    const item = document.createElement('li');
    item.className = 'project';
    const info = document.createElement('div');
    const title = document.createElement('h3');
    title.className = 'project-name';
    title.textContent = project.name;
    const status = document.createElement('p');
    status.className = 'project-status';
    status.textContent = project.status;
    info.append(title, status);
    const actions = document.createElement('div');
    actions.className = 'actions';
    const edit = document.createElement('button');
    edit.type = 'button'; edit.className = 'edit-button'; edit.textContent = 'Edit';
    edit.setAttribute('aria-label', `Edit ${project.name}`);
    edit.addEventListener('click', () => {
      if (busy) return;
      editingId = project.id; nameInput.value = project.name; statusInput.value = project.status;
      saveButton.textContent = 'Save changes'; cancelButton.hidden = false;
      document.querySelector('#form-title').textContent = 'Edit project'; nameInput.focus();
    });
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'delete-button'; remove.textContent = 'Delete';
    remove.setAttribute('aria-label', `Delete ${project.name}`);
    remove.addEventListener('click', async () => {
      if (busy || !confirm(`Delete ${project.name}?`)) return;
      setBusy(true); tell('Deleting...');
      try { await store.remove(project.id); if (editingId === project.id) resetForm(); await refresh(); tell('Project deleted.'); }
      catch (error) { tell(error.message + ' Check that the server is running.', true); }
      finally { setBusy(false); }
    });
    actions.append(edit, remove); item.append(info, actions); list.append(item);
  }
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  const project = { name: nameInput.value.trim(), status: statusInput.value };
  if (!project.name) { tell('Enter a project name.', true); nameInput.focus(); return; }
  setBusy(true); tell('Saving...');
  try {
    if (editingId === null) await store.create(project);
    else await store.update(editingId, project);
    resetForm(); await refresh(); tell('Project saved.');
  } catch (error) { tell(error.message + ' Check that the server is running.', true); }
  finally { setBusy(false); }
});
cancelButton.addEventListener('click', resetForm);
setBusy(true); tell('Loading projects...');
refresh().then(() => tell('Ready.')).catch(error => tell(error.message + ' Check that the server is running.', true)).finally(() => setBusy(false));
