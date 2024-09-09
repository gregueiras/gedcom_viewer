import React, { useEffect, useState } from "react";

import Cytoscape, {
  EdgeDataDefinition,
  ElementDefinition,
  NodeDataDefinition,
} from "cytoscape";
import CytoscapeComponent from "react-cytoscapejs";
import { parse, compact } from "gedcom";
import Loading from "./loading";
import dagre from "cytoscape-dagre";

Cytoscape.use(dagre);

const _INDIVIDUAL = "INDI";
const _FAMILY = "FAM";

const GedcomTree: React.FC<{ file: File }> = ({ file }) => {
  const [elements, setElements] = useState<ElementDefinition[] | null>(null);

  useEffect(() => {
    const loadFamily = async () => {
      const rawFamily = parse(await file.text());
      const family = compact(rawFamily);

      const newElements = [] as ElementDefinition[];
      const types = new Set();

      const individuals = family.children.filter(
        ({ type }) => type == _INDIVIDUAL
      );
      const families = family.children.filter(({ type }) => type == _FAMILY);
      const setIndividuals = new Set();

      for (let child of individuals) {
        const name = child.data?.["NAME"] ?? "name";
        const birthPlace = child.data?.["BIRTH/PLACE"] ?? "N/A";
        const id = child.data?.["xref_id"] as string;

        if (id == null) {
          continue;
        }

        const data: NodeDataDefinition = {
          id: id,
          label: birthPlace,
          description: name,
        };

        if (newElements.length < 100) {
          setIndividuals.add(id);
          newElements.push({ data });
        }
      }

      console.warn(newElements.length);

      for (let family of families) {
        const wife = family.data?.["@WIFE"] as string | null;
        const husband = family.data?.["@HUSBAND"] as string | null;

        const mainChild = family.data?.["@CHILD"] as string;
        const otherChildren = family.data?.["+CHILD"] as string[] | null;

        const children = [mainChild, ...(otherChildren ?? [])];

        for (let child of children) {
          if (wife) {
            const edge = {
              data: {
                source: wife,
                target: child,
                label: "Mãe",
              },
              classes: ["mae"],
            };

            if (setIndividuals.has(child) && setIndividuals.has(wife)) {
              newElements.push(edge);
            }
          }

          if (husband) {
            const edge = {
              data: {
                source: husband,
                target: child,
                label: "Pai",
                class: "pai",
              },
              classes: ["pai"],
            };

            if (setIndividuals.has(child) && setIndividuals.has(husband)) {
              newElements.push(edge);
            }
          }
        }
      }

      console.log(types);
      console.log(newElements[0]);
      console.log(newElements[1]);
      console.log(individuals[0]);

      setElements(newElements);
      console.warn(newElements.length);
    };

    loadFamily();
  }, [file]);

  /*   const elements = [
    { data: { id: "one", label: "Node 1" } },
    { data: { id: "two", label: "Node 2" } },
    {
      data: { source: "one", target: "two", label: "Edge from Node1 to Node2" },
    },
  ]; */

  /*   const layout = {
    name: "random",
  }; */
  const layout = {
    name: "dagre",
    rankDir: "LR",
    nodeSep: 90,
    edgeSep: 160,
    rankSep: 300,
    padding: 10,
    animate: true, // whether to transition the node positions
  };

  const stylesheet = [
    {
      selector: ".pai",
      style: {
        "line-color": "blue",
      },
    },
    {
      selector: ".mae",
      style: {
        "line-color": "pink",
      },
    },
    {
      selector: "node",
      style: {
        label: "data(label)",
        width: 20,
        height: 20,
      },
    },
    {
      selector: "edge",
      style: {
        label: "data(label)",
        width: 5,
      },
    },
    {
      selector: ":selected",
      style: {
        label: "data(description)",
      },
    },
  ];

  return elements == null ? (
    <Loading />
  ) : (
    <CytoscapeComponent
      elements={elements}
      style={{ width: "600px", height: "600px" }}
      layout={layout}
      stylesheet={stylesheet}
    />
  );
};

export default GedcomTree;
