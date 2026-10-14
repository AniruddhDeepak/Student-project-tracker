
"use strict";

const form = document.querySelector("#project-form");
const nameInput = document.querySelector("#name");
const statusInput = document.querySelector("#status");
const projectList = document.querySelector("#project-list");
const emptyState = document.querySelector("#empty-state");

const projects = [];

function renderProjects() {
  // Remove existing list items to prevent duplicates.
  projectList.textContent = "";

  // Update the empty-state message if it exists.
  if (emptyState) {
    emptyState.hidden = projects.length > 0;
  }

  // Display every project stored in the array.
  projects.forEach((project) => {
    const listItem = document.createElement("li");
    const projectName = document.createElement("span");
    const projectStatus = document.createElement("span");

    projectName.textContent = project.name;
    projectStatus.textContent = ` — ${project.status}`;

    listItem.append(projectName, projectStatus);
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

  const project = {
    id: crypto.randomUUID(),
    name: name,
    status: status
  };

  projects.push(project);

  renderProjects();

  form.reset();
  nameInput.focus();
});
