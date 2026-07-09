<section class="hero" aria-labelledby="hero-title">
  <div class="hero-copy">
    <p class="eyebrow">Obsidian plugin</p>
    <h1 id="hero-title">Task boards that stay inside your notes.</h1>
    <p class="hero-text">
      Tasks Eye turns regular Markdown notes into focused boards, repair queues,
      review views, editor actions, and daily summaries. The feature
      documentation below is generated from executable feature folders.
    </p>
    <div class="hero-actions" aria-label="Primary links">
      <a href="#features">Explore features</a>
      <a href="testing.md">Acceptance testing</a>
    </div>
  </div>
</section>

<section class="section intro" aria-labelledby="intro-title">
  <div>
    <p class="eyebrow">Design intent</p>
    <h2 id="intro-title">A quiet command center for note-centered work.</h2>
  </div>
  <p>
    Tasks Eye is built for a vault where each piece of work lives as a note
    under <code>Db/</code>. The plugin reads note frontmatter, unfinished Tasks
    items, due dates, contexts from folders, vacation configuration, and
    completed-task markers. Feature folders now own the rationale, tests,
    screenshots, and generated documentation for that behavior.
  </p>
</section>

<section class="section flow" aria-labelledby="flow-title">
  <div class="section-heading">
    <p class="eyebrow">Workflow</p>
    <h2 id="flow-title">From active work to daily review.</h2>
  </div>
  <ol class="flow-list">
    <li>
      <strong>Open</strong>
      <span>Review actionable notes grouped by due date.</span>
    </li>
    <li>
      <strong>Inbox</strong>
      <span>Fix one validation rule at a time.</span>
    </li>
    <li>
      <strong>Hold</strong>
      <span>Keep backlog notes visible outside today's work.</span>
    </li>
    <li>
      <strong>Done</strong>
      <span>Review completed tasks in a view or daily note.</span>
    </li>
  </ol>
</section>

<section id="features" class="section" aria-labelledby="features-title">
  <div class="section-heading">
    <p class="eyebrow">Executable features</p>
    <h2 id="features-title">Every feature below comes from <code>features/&lt;slug&gt;/</code>.</h2>
    <p>
      Each folder provides typed metadata, <code>why.md</code>, feature-owned
      tests, and WDIO screenshots captured in Obsidian Light, Obsidian Dark, and
      Dark with the Minimal theme.
    </p>
  </div>

  {{featureScreens}}
</section>

<section id="feature-docs" class="section feature-docs" aria-labelledby="feature-docs-title">
  <div class="section-heading">
    <p class="eyebrow">Feature index</p>
    <h2 id="feature-docs-title">Generated documentation pages.</h2>
    <p>
      The list is sorted by feature folder name. Prefixes group related
      behavior, such as actions, views, and validation violations.
    </p>
  </div>
  {{featureDocsIndex}}
</section>

<section id="shortcuts" class="section shortcuts" aria-labelledby="shortcuts-title">
  <div class="section-heading">
    <p class="eyebrow">Keyboard shortcuts</p>
    <h2 id="shortcuts-title">Default shortcuts for feature-backed commands.</h2>
    <p>
      These defaults are assigned by the plugin and can be changed in Obsidian's
      hotkey settings. Each shortcut links back to the feature that owns its
      behavior.
    </p>
  </div>
  {{keyboardShortcuts}}
</section>

<section id="testing" class="section testing" aria-labelledby="testing-title">
  <div class="section-heading">
    <p class="eyebrow">Executable documentation</p>
    <h2 id="testing-title">Feature folders feed tests, screenshots, and docs.</h2>
  </div>
  <p>
    The acceptance suite launches a sandboxed Obsidian app, installs the Tasks
    plugin and Minimal theme, opens a fresh fixture vault, exercises feature
    scenarios, and captures the screenshots used by this site.
  </p>
  <pre><code>npm test
npm run acceptance:test
npm run docs:screenshots</code></pre>
  <p>
    To publish with GitHub Pages without CI, configure repository Pages to
    deploy from the <code>/docs</code> folder on the branch you choose.
  </p>
</section>
