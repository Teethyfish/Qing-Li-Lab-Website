export type ProfileContact = {
  publicEmail: string;
  title: string;
  department: string;
  phone: string;
  office: string;
  website: string;
};

export type ProfileBlockLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};

export type ProfilePublication = {
  id: string;
  title: string;
  authors: string;
  description: string;
  journal: string;
  publishDate: string;
  doi: string;
  url: string;
};

export type ProfileTile = {
  id: string;
  type: "text" | "photo";
  title: string;
  content: string;
  imageUrl: string;
  size: "standard" | "wide" | "large";
  layout: ProfileBlockLayout;
};

export type PublicProfileContent = {
  version: 1;
  contact: ProfileContact;
  publications: ProfilePublication[];
  tiles: ProfileTile[];
  layout: {
    contact: ProfileBlockLayout;
    publications: ProfileBlockLayout;
  };
};

export const PROFILE_HEADER_LAYOUT: ProfileBlockLayout = { x: 20, y: 20, width: 340, height: 610, zIndex: 1 };
export const DEFAULT_CONTACT_LAYOUT: ProfileBlockLayout = { x: 380, y: 20, width: 330, height: 420, zIndex: 2 };
export const DEFAULT_PUBLICATIONS_LAYOUT: ProfileBlockLayout = { x: 730, y: 20, width: 350, height: 700, zIndex: 3 };

export function profileTileSize(size: ProfileTile["size"]) {
  if (size === "wide") return { width: 520, height: 280 };
  if (size === "large") return { width: 520, height: 430 };
  return { width: 300, height: 280 };
}

export function defaultProfileTileLayout(index: number, size: ProfileTile["size"] = "standard"): ProfileBlockLayout {
  const dimensions = profileTileSize(size);
  return {
    x: 20 + (index % 3) * 330,
    y: 750 + Math.floor(index / 3) * 310,
    ...dimensions,
    zIndex: 4 + index,
  };
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function layoutFromUnknown(value: unknown, fallback: ProfileBlockLayout): ProfileBlockLayout {
  const source = value && typeof value === "object" ? value as Partial<ProfileBlockLayout> : {};
  return {
    x: numberValue(source.x, fallback.x),
    y: numberValue(source.y, fallback.y),
    width: numberValue(source.width, fallback.width),
    height: numberValue(source.height, fallback.height),
    zIndex: numberValue(source.zIndex, fallback.zIndex),
  };
}

export function emptyPublicProfile(email = ""): PublicProfileContent {
  return {
    version: 1,
    contact: { publicEmail: email, title: "", department: "", phone: "", office: "", website: "" },
    publications: [],
    tiles: [],
    layout: {
      contact: { ...DEFAULT_CONTACT_LAYOUT },
      publications: { ...DEFAULT_PUBLICATIONS_LAYOUT },
    },
  };
}

export function publicProfileFromUnknown(value: unknown, email = ""): PublicProfileContent {
  const fallback = emptyPublicProfile(email);
  if (!value || typeof value !== "object") return fallback;
  const source = value as Partial<PublicProfileContent>;
  const contact = source.contact && typeof source.contact === "object" ? source.contact : fallback.contact;
  const layout = source.layout && typeof source.layout === "object" ? source.layout : fallback.layout;
  const publications = Array.isArray(source.publications) ? source.publications.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const item = value as Partial<ProfilePublication> & { citation?: unknown };
    if (typeof item.id !== "string") return [];
    return [{
      id: item.id,
      title: typeof item.title === "string" ? item.title : "",
      authors: typeof item.authors === "string" ? item.authors : "",
      description: typeof item.description === "string" ? item.description : typeof item.citation === "string" ? item.citation : "",
      journal: typeof item.journal === "string" ? item.journal : "",
      publishDate: typeof item.publishDate === "string" ? item.publishDate : "",
      doi: typeof item.doi === "string" ? item.doi : "",
      url: typeof item.url === "string" ? item.url : "",
    }];
  }) : [];
  const tiles = Array.isArray(source.tiles) ? source.tiles.flatMap((value, index) => {
    if (!value || typeof value !== "object") return [];
    const tile = value as Partial<ProfileTile>;
    if (typeof tile.id !== "string") return [];
    const size: ProfileTile["size"] = tile.size === "wide" || tile.size === "large" ? tile.size : "standard";
    return [{
      id: tile.id,
      type: tile.type === "photo" ? "photo" as const : "text" as const,
      title: typeof tile.title === "string" ? tile.title : "",
      content: typeof tile.content === "string" ? tile.content : "",
      imageUrl: typeof tile.imageUrl === "string" ? tile.imageUrl : "",
      size,
      layout: layoutFromUnknown(tile.layout, defaultProfileTileLayout(index, size)),
    }];
  }) : [];
  return {
    version: 1,
    contact: {
      publicEmail: typeof contact.publicEmail === "string" ? contact.publicEmail : email,
      title: typeof contact.title === "string" ? contact.title : "",
      department: typeof contact.department === "string" ? contact.department : "",
      phone: typeof contact.phone === "string" ? contact.phone : "",
      office: typeof contact.office === "string" ? contact.office : "",
      website: typeof contact.website === "string" ? contact.website : "",
    },
    publications,
    tiles,
    layout: {
      contact: layoutFromUnknown(layout.contact, DEFAULT_CONTACT_LAYOUT),
      publications: layoutFromUnknown(layout.publications, DEFAULT_PUBLICATIONS_LAYOUT),
    },
  };
}
