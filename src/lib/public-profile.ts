export type ProfileContact = {
  publicEmail: string;
  title: string;
  department: string;
  phone: string;
  office: string;
  website: string;
};

export type ProfilePublication = {
  id: string;
  title: string;
  citation: string;
  url: string;
};

export type ProfileTile = {
  id: string;
  type: "text" | "photo";
  title: string;
  content: string;
  imageUrl: string;
  size: "standard" | "wide" | "large";
};

export type PublicProfileContent = {
  version: 1;
  contact: ProfileContact;
  publications: ProfilePublication[];
  tiles: ProfileTile[];
};

export function emptyPublicProfile(email = ""): PublicProfileContent {
  return {
    version: 1,
    contact: { publicEmail: email, title: "", department: "", phone: "", office: "", website: "" },
    publications: [],
    tiles: [],
  };
}

export function publicProfileFromUnknown(value: unknown, email = ""): PublicProfileContent {
  const fallback = emptyPublicProfile(email);
  if (!value || typeof value !== "object") return fallback;
  const source = value as Partial<PublicProfileContent>;
  const contact = source.contact && typeof source.contact === "object" ? source.contact : fallback.contact;
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
    publications: Array.isArray(source.publications) ? source.publications : [],
    tiles: Array.isArray(source.tiles) ? source.tiles : [],
  };
}
