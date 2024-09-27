import React, { useEffect, useMemo, useState } from "react";

import Cytoscape, { ElementDefinition, NodeDataDefinition } from "cytoscape";
import CytoscapeComponent from "react-cytoscapejs";
import { parse, compact } from "gedcom";
import Loading from "./loading";
import dagre from "cytoscape-dagre";
import { ReactSearchAutocomplete } from "react-search-autocomplete";
import {
  Individual,
  IndividualName,
  Family,
  FamilyGraph,
  GraphResult,
} from "../model/data";
import { count } from "console";

Cytoscape.use(dagre);

const _INDIVIDUAL = "INDI";
const _FAMILY = "FAM";

function allEqual<K>(arr: K[]): boolean {
  return arr.length > 1 && arr.every((v) => v === arr[0]);
}

/*
while exists vertex v with degree 2:
    - remove v and the 2 outgoing edges
    - add a new edge between the neighbors of v
    - the weight of the new edge is the sum of the weights of the deleted edge
*/

function getParentEdges(
  id: string,
  edges: ElementDefinition[]
): NodeDataDefinition[] {
  return edges.filter((edge) => edge.data.target === id);
}
function getChildrenEdges(
  id: string,
  edges: ElementDefinition[]
): NodeDataDefinition[] {
  return edges.filter((edge) => edge.data.source === id);
}

function parentsFromSamePlace(
  id: string,
  idLocation: Map<string, string>,
  edges: ElementDefinition[]
): boolean {
  const locations = [
    idLocation.get(id),
    ...getParentEdges(id, edges).map((edge) =>
      idLocation.get(edge.data.source)
    ),
  ];

  return allEqual(locations);
}

function hasParent(id: string, edges: ElementDefinition[]): boolean {
  return getParentEdges(id, edges).length > 0;
}

function cleanParents(
  edges: ElementDefinition[],
  nodes: ElementDefinition[]
): Map<string, ElementDefinition> {
  const idLocation = new Map<string, string>();
  for (const node of nodes) {
    console.log(node);
    const id = node.data.id!;
    const birthPlace = node.data.birthPlace;
    idLocation.set(id, birthPlace);
  }

  for (const node of nodes) {
    const id = node.data.id!;

    if (parentsFromSamePlace(id, idLocation, edges)) {
      node.data["sameLocation"] = true;

      const cardinality: number = getParentEdges(id, edges)
        .map((edge) => edge.data?.["sameLocationN"] ?? 0)
        .reduce((acc, edge) => acc + edge);
      node.data["sameLocationN"] = cardinality + 1;

      edges = edges.filter(
        (edge) =>
          !(
            edge.data.target === id &&
            getParentEdges(edge.data.source, edges).length === 0
          )
      );
    }
  }

  const remainingNodes = nodes.filter(
    (node) => true
    //(node) => getChildrenEdges(node.data.id!, edges).length > 0 || getParentEdges(node.data.id!, edges).length > 0
  );

  //console.warn(remainingNodes.length)

  const result = new Map<string, ElementDefinition>();
  for (const node of remainingNodes) {
    result.set(node.data.id!, node);
  }

  return result;
}

type IndividualsMap = Map<string, Individual>;
type FamiliesMap = Map<string, Family>;

const GedcomTree: React.FC<{ file: File }> = ({ file }) => {
  const [showTree, setShowTree] = useState(false);
  const [maxLimitFamilies, setMaxLimitFamilies] = useState<number | null>(null);
  const [limitFamilies, setLimitFamilies] = useState(10);
  //const [elements, setElements] = useState<ElementDefinition[] | null>(null);
  const [individuals, setIndividuals] = useState<IndividualsMap>(new Map());
  const [families, setFamilies] = useState<FamiliesMap>(new Map());

  const [chosenPerson, setChosenPerson] = useState<Individual | null>(null);

  function getParents(
    chosenPerson: Individual,
    individuals: IndividualsMap,
    families: FamiliesMap
  ): GraphResult[] {
    const graph = new FamilyGraph(
      Array.from(individuals.values()),
      Array.from(families.values())
    );

    console.log(Object.keys(graph.adjacencyList).length);
    const result = graph.bfs(chosenPerson.id);
    setMaxLimitFamilies(result.length);

    console.log(result);
    console.log(
      result.map(({ node }) => (node ? individuals.get(node)!.name : ""))
    );

    return result;
  }

  useEffect(() => {
    const loadFamily = async () => {
      const rawFamily = parse(await file.text());
      const family = compact(rawFamily);

      const newIndividualsMap: IndividualsMap = new Map<string, Individual>();
      const newFamiliesMap: FamiliesMap = new Map();

      family.children
        .filter(({ type, data }) => type == _INDIVIDUAL && data !== null)
        .forEach(({ data }) => {
          const individual = new Individual(data!);
          newIndividualsMap.set(individual.id, individual);
        });
      family.children
        .filter(({ type, data }) => type == _FAMILY && data !== null)
        .forEach(({ data }) => {
          const family = new Family(data!);
          newFamiliesMap.set(family.id, family);
        });

      console.log(Array.from(families.values())[0]);
      console.log(Array.from(individuals.values())[0]);

      setIndividuals(newIndividualsMap);
      setFamilies(newFamiliesMap);
    };

    loadFamily();
  }, [file]);

  const elements: ElementDefinition[] | null = useMemo(() => {
    console.log(
      `chosenPerson: ${chosenPerson?.name} maxLimitFamilies: ${maxLimitFamilies}`
    );
    if (chosenPerson) {
      const auxAncestors = getParents(chosenPerson!, individuals, families);
      const ancestors = auxAncestors.slice(
        0,
        limitFamilies ?? auxAncestors.length
      );

      const newElements: ElementDefinition[] = [];
      const ids: string[] = [];

      for (const ancestor of ancestors) {
        const own = individuals.get(ancestor.node);
        const father = individuals.get(ancestor.edges[0]);
        const mother = individuals.get(ancestor.edges[1]);

        if (own && !ids.includes(own.id)) {
          const data: NodeDataDefinition = {
            id: own.id,
            description: own.birth_place,
            label: own.name,
            birthPlace: own.birth_place,
          };

          newElements.push({ data });
          ids.push(own.id);
        }

        if (father && own) {
          if (!ids.includes(father.id)) {
            const data: NodeDataDefinition = {
              id: father.id,
              description: father.birth_place,
              label: father.name,
              birthPlace: father.birth_place,
            };

            newElements.push({ data });
            ids.push(father.id);
          }

          const edge = {
            data: {
              source: father.id,
              target: own.id,
              label: "Pai",
            },
            classes: ["father"],
          };
          newElements.push(edge);
        }
        if (mother && own) {
          if (!ids.includes(mother.id)) {
            const data: NodeDataDefinition = {
              id: mother.id,
              description: mother.birth_place,
              label: mother.name,
              birthPlace: mother.birth_place,
            };

            newElements.push({ data });
            ids.push(mother.id);
          }

          const edge = {
            data: {
              source: mother.id,
              target: own.id,
              label: "Mãe",
            },
            classes: ["mother"],
          };
          newElements.push(edge);
        }
      }

      console.dir(newElements);
      //setElements(newElements);
      return newElements;
    }

    return null;
  }, [chosenPerson, limitFamilies]);

  const layout = {
    name: "dagre",
    rankDir: "LR",
    nodeSep: 90,
    edgeSep: 160,
    rankSep: 300,
    padding: 10,
    animate: true,
  };

  const stylesheet = [
    {
      selector: ".father",
      style: {
        "line-color": "blue",
      },
    },
    {
      selector: ".mother",
      style: {
        "line-color": "pink",
      },
    },
    {
      selector: "node",
      style: {
        label: "data(label)",
      },
    },
    {
      selector: "edge",
      style: {
        label: "data(label)",
      },
    },
    {
      selector: "node:selected",
      style: {
        label: "data(description)",
        //label: "data(sameLocationN)",
      },
    },
    {
      selector: "node[sameLocation]",
      style: {
        shape: "triangle",
      },
    },
  ];

  const names: IndividualName[] = Array.from(individuals.values()).map(
    ({ id, name }) => ({
      id,
      name,
    })
  );

  const handleOnSearch = (string: string, results: IndividualName[]) => {};

  const handleOnSelect = (result: IndividualName) => {
    const selected = individuals.get(result.id);
    if (selected) {
      setChosenPerson(selected);
    }
  };

  const formatResult = (item: IndividualName) => {
    return (
      <>
        <span style={{ display: "block", textAlign: "left" }}>{item.name}</span>
      </>
    );
  };

  return (
    <>
      <div>
        <span>Show tree</span>
        <input
          type="checkbox"
          checked={showTree}
          onChange={() => setShowTree(!showTree)}
        />
        {maxLimitFamilies && (
          <input
            type="number"
            step={1}
            value={limitFamilies}
            min={1}
            max={maxLimitFamilies}
            onChange={(newLimit) => {
              const newValue = parseInt(newLimit.currentTarget.value);
              console.dir(newValue);
              setLimitFamilies(newValue);
            }}
          />
        )}
        <ReactSearchAutocomplete<IndividualName>
          items={names}
          onSearch={handleOnSearch}
          onSelect={handleOnSelect}
          placeholder="Type to search"
          autoFocus
          formatResult={formatResult}
        />
        {chosenPerson && (
          <>
            <div style={{ flexDirection: "column" }}>
              <div>{chosenPerson.name}</div>
              <div>{chosenPerson.birth_place}</div>
              <pre id="json">{JSON.stringify(chosenPerson.data, null, "\t")}</pre>
            </div>
          </>
        )}
      </div>
      {showTree && elements !== null ? (
        <CytoscapeComponent
          elements={elements}
          style={{ width: "100%", height: "600px" }}
          layout={layout}
          stylesheet={stylesheet}
          cy={(cy) => {
            cy.on("add", "node", (_evt) => {
              cy.layout(layout).run();
              cy.fit();
            });
          }}
        />
      ) : (
        <Loading />
      )}
    </>
  );
};

export default GedcomTree;
