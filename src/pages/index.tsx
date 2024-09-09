import React, { useState } from "react";

import type { HeadFC, PageProps } from "gatsby";
import { pageStyles, headingStyles } from "../constants/styles";
import GedcomTree from "../components/gedcom_tree";
import {IconAttribution} from "./about";

const IndexPage: React.FC<PageProps> = () => {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <main style={pageStyles}>
      <h1 style={headingStyles}>GEDCOM Viewer</h1>
      <input id="file" type="file" onChange={handleFileChange} />
      {file && <GedcomTree file={file} />}
      <IconAttribution />
    </main>
  );
};

export default IndexPage;

export const Head: HeadFC = () => <title>Home Page</title>;
