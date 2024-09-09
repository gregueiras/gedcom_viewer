import * as React from "react";

export const IconAttribution = () => {
  return (
    <div>
      <p>The icon used was created by:</p>
      <a href="https://www.flaticon.com/free-icons/dna" title="dna icons">
        Dna icons created by Smashicons - Flaticon
      </a>
    </div>
  );
};

const AboutPage = () => {
  return (
    <main>
      <h1>About Me</h1>
      <p>
        Hi there! I'm the proud creator of this site, which I built with Gatsby.
      </p>
      <IconAttribution />
    </main>
  );
};

export const Head = () => <title>About Me</title>;

export default AboutPage;
