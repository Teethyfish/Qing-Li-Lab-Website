// src/data/people.ts
export type Person = {
  name: string;
  slug: string;      // clean, lowercase, hyphenated
  email?: string;    // used to pull public bio from DB
};

export const PEOPLE: Person[] = [
  { name: "Qing X. Li", slug: "qing-li", email: "qingl@hawaii.edu" }, // update later
  { name: "Hoi Lam (Lynn) Zhang", slug: "lynn-zhang", email: "hoilamz@hawaii.edu" },
];
