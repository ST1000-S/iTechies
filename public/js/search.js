// Get providers data from hidden script tag
const providers = JSON.parse(
  document.getElementById("providers-data").textContent
);

// Initialize Lunr search index
const idx = lunr(function () {
  this.ref("id");
  this.field("name");
  this.field("skills");
  this.field("location");

  providers.forEach((provider) => {
    this.add({
      id: provider._id,
      name: provider.name,
      skills: provider.skills.join(" "),
      location: provider.location,
    });
  });
});

// Get DOM elements
const searchInput = document.getElementById("searchInput");
const resultsContainer = document.getElementById("searchResults");

// Handle search input
searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim();

  // Perform search
  const results = idx.search(query);

  // Update results
  resultsContainer.innerHTML = results
    .map((result) => {
      const provider = providers.find((p) => p._id === result.ref);
      return `
      <div class="card mb-3">
        <div class="card-body">
          <h5>${provider.name}</h5>
          <p>Skills: ${provider.skills.join(", ")}</p>
          <p>Location: ${provider.location}</p>
        </div>
      </div>
    `;
    })
    .join("");
});
