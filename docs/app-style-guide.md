A modern, minimal dashboard layout for a document archiving and sharing application, with a focus on clean typography,
generous white space, and a calm, utilitarian feel.

## Overall layout and structure

- Full-height application shell with a fixed top navigation bar and a secondary horizontal sub-nav directly beneath it.
- Content area centered in a max-width container, with large vertical spacing between sections, giving a breathable,
  uncluttered look.
- Single-column main content with a prominent section title, then cards and tables stacked vertically using consistent
  spacing and subtle separators.

## Navigation and header

- Top header bar using a very light background (near white or very pale gray) with low-contrast borders and no heavy
  shadows, spanning full width.
- Left-aligned application logo/name, then primary organization selector or organization name in a medium-weight font.
- Right side of the top bar: compact icon-only elements such as a theme switcher, a user avatar or initials in a rounded
  shape, and possibly a notification or help icon, all using subtle hover states.

## Sub-navigation and page controls

- Directly under the top bar, a horizontal navigation with text-only tabs for key sections: “Home”, “Documents”, “Tags”,
  “Tagging rules”, “Members”, “Deleted documents”, “Settings”.
- Tabs styled as simple text with slightly bolder weight for the active tab, plus a minimal bottom border or pill
  background for the selected state; inactive tabs are low-contrast gray.
- On the same horizontal line (or right-aligned counterpart), place page-level controls such as a search input (
  “Search…” placeholder), an “Import a document” button, and a primary “Upload documents” action button with subtle
  rounded corners and slightly stronger accent color.

## Typography and color language

- Use a modern sans-serif typeface with clear hierarchy: large, bold page titles; medium-weight section headings;
  regular-weight body copy and table text.
- Primary color palette with a calm accent (e.g., desaturated blue or teal) for primary buttons, links, and active
  states; neutral grayscale for backgrounds and borders.
- Links (such as document names) are colored with the primary accent and underlined or strongly highlighted on hover,
  while most other text remains neutral and understated.

## Home dashboard content

- At the top of the main content, show a concise organization title or breadcrumb, followed by a high-level stats area
  summarizing document counts and storage usage (e.g., “X documents in total” and “Y MB total size”).
- Present stats as small inline metric chips or very simple statistic blocks with label text in muted gray and values in
  more prominent, slightly larger text.
- Below the metrics, display a “Latest imported documents” section with a single card-like container housing a data
  table.

## Table styling and behavior

- Table header row with labels like “File name”, “Tags”, “Created at”, and “Actions” set in small, uppercase or
  semi-uppercase text with reduced opacity.
- Table rows with alternating subtle background or a light hover highlight to guide the eye; row content left-aligned
  for text columns and right-aligned for actions.
- File name column shows the document name as a clickable link with a compact file size and type inline (e.g., “3.53
  KB – json – 11 seconds ago”) in a smaller, muted font; trailing columns show tags and created-at timestamps.
- Actions column uses minimal icon buttons for “View”, “Download”, “Delete”, kept very subtle, emphasizing more on row
  hover.

## Pagination and density controls

- At the bottom of the table, include a low-profile pagination bar: a “Rows per page” dropdown, current page info (“Page
  1 of N”), and minimal text buttons or icon buttons for first/previous/next/last page.
- Pagination controls use small font sizes and light borders, sitting flush with the table container to feel like part
  of the same component.

## Secondary pages consistency

- Documents page: same layout as the “Latest imported documents” section, but the table is the primary focus, possibly
  with filters and tag-based chips above it; everything remains light, with no heavy filters sidebar.
- Tags and Tagging rules pages: simple tabular or list views, using the same table style, with inline chips for tags and
  concise descriptions, maintaining visual rhythm and spacing.
- Members page: similar table layout, columns for member name, email, role, and actions, keeping consistent typography,
  column spacing, and hover behavior across all list-style pages.

## Interactions, states, and tone

- Hover states rely on subtle background tints and small color shifts rather than big shadows or animations, matching a
  restrained, professional tone for a document archiving platform.
- Empty states for tables or metric areas use short, calm copy and a simple outline button for the primary action (e.g.,
  “No documents yet – Upload your first document”), with no illustrations or overly playful visuals.
- Overall atmosphere should feel **trustworthy** and utility-first: clean lines, low visual noise, no gradients or loud
  colors, with every component focused on readability and quick scanning of documents and metadata.

## Forms and inputs

- Never put a input field on the same line as a label,