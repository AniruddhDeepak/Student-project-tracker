
"use strict";

const form = document.querySelector("#project-form");
const nameInput = document.querySelector("#name");
const statusInput = document.querySelector("#status");
const saveButton = document.querySelector("#save-button");
const cancelButton = document.querySelector("#cancel-button");
const formTitle = document.querySelector("#form-title");
const message = document.querySelector("#message");
const projectList = document.querySelector("#project-list");
const emptyState = document.querySelector("#empty-state");

const STORAGE_KEY = "workshop-projects-v1";
const projects = [];
let editingId = null;
let storageWritesBlocked = false;
let storageProblem = "";

function resetForm() {
  form.reset();
  editingId = null;
  saveButton.textContent = "Save project";
  cancelButton.hidden = true;
  formTitle.textContent = "Add or edit a project";
}

function isValidProjectArray(data) {
  if (!Array.isArray(data)) {
    return false;
  }

  const seenIds = new Set();
  const validStatuses = ["Planned", "In Progress", "Completed"];

  return data.every((project) => {
    if (
      project === null ||
      typeof project !== "object" ||
      typeof project.id !== "string" ||
      project.id.length === 0 ||
      typeof project.name !== "string" ||
      project.name.trim().length === 0 ||
      project.name.length > 80 ||
      !validStatuses.includes(project.status) ||
      seenIds.has(project.id)
    ) {
      return false;
    }

    seenIds.add(project.id);
    return true;
  });
}

function loadProjects() {
  let savedText;

  try {
    savedText = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    storageWritesBlocked = true;
    storageProblem =
      "Browser storage could not be read. Changes may not be saved.";
    message.textContent = storageProblem;
    return;
  }

  // No saved data yet is normal for a first visit.
  if (savedText === null) {
    return;
  }

  let savedProjects;

  try {
    savedProjects = JSON.parse(savedText);
  } catch (error) {
    storageWritesBlocked = true;
    storageProblem =
      "Saved project data is invalid JSON. It has been left untouched.";
    message.textContent = storageProblem;
    return;
  }

  if (!isValidProjectArray(savedProjects)) {
    storageWritesBlocked = true;
    storageProblem =
      "Saved project data has an invalid format. It has been left untouched.";
    message.textContent = storageProblem;
    return;
  }

  projects.push(...savedProjects);
}

function saveProjects() {
  if (storageWritesBlocked) {
    message.textContent =
      `${storageProblem} Changes are only in memory and will not persist.`;
    return false;
  }

  try {
    // Convert the projects array into text for localStorage.
    const savedText = JSON.stringify(projects);
    localStorage.setItem(STORAGE_KEY, savedText);
    return true;
  } catch (error) {
    message.textContent =
      "Changes could not be saved to browser storage. They remain in memory for now.";
    return false;
  }
}

function renderProjects() {
  projectList.textContent = "";

  if (emptyState) {
    emptyState.hidden = projects.length > 0;
  }

  projects.forEach((project) => {
    const listItem = document.createElement("li");
    const projectDetails = document.createElement("span");
    const editButton = document.createElement("button");
    const deleteButton = document.createElement("button");

    projectDetails.textContent = `${project.name} — ${project.status}`;

    editButton.type = "button";
    editButton.textContent = "Edit";

    editButton.addEventListener("click", () => {
      editingId = project.id;
      nameInput.value = project.name;
      statusInput.value = project.status;

      saveButton.textContent = "Save changes";
      cancelButton.hidden = false;
      formTitle.textContent = "Edit project";
      message.textContent = `Editing ${project.name}.`;

      nameInput.focus();
    });

    deleteButton.type = "button";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", () => {
      const projectIndex = projects.findIndex(
        (item) => item.id === project.id
      );

      if (projectIndex === -1) {
        return;
      }

      const projectToDelete = projects[projectIndex];

      const confirmed = window.confirm(
        `Delete "${projectToDelete.name}" ` +
        `(${projectToDelete.status}, ID: ${projectToDelete.id})?`
      );

      if (!confirmed) {
        return;
      }

      projects.splice(projectIndex, 1);

      if (editingId === projectToDelete.id) {
        resetForm();
      }

      const saved = saveProjects();

      if (saved) {
        message.textContent =
          `Project "${projectToDelete.name}" deleted and saved.`;
      }

      renderProjects();
    });

    listItem.append(
      projectDetails,
      document.createTextNode(" "),
      editButton,
      document.createTextNode(" "),
      deleteButton
    );

    projectList.appendChild(listItem);
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const status = statusInput.value;

  if (name.length === 0) {
    nameInput.setCustomValidity("Please enter a project name.");
    nameInput.reportValidity();
    nameInput.setCustomValidity("");
    return;
  }

  if (name.length > 80) {
    message.textContent = "Project names must be 80 characters or fewer.";
    nameInput.focus();
    return;
  }

  if (editingId !== null) {
    const project = projects.find((item) => item.id === editingId);

    if (!project) {
      message.textContent = "The selected project could not be found.";
      resetForm();
      return;
    }

    project.name = name;
    project.status = status;

    resetForm();
    renderProjects();

    if (saveProjects()) {
      message.textContent = "Project updated and saved.";
    }
  } else {
    projects.push({
      id: crypto.randomUUID(),
      name: name,
      status: status
    });

    resetForm();
    renderProjects();

    if (saveProjects()) {
      message.textContent = "Project added and saved.";
    }
  }
});

cancelButton.addEventListener("click", () => {
  resetForm();
  message.textContent = "Edit cancelled. No changes were saved.";
});

// Restore saved projects before displaying the list.
loadProjects();
renderProjects();
