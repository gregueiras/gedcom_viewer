import { Data } from "unist";

type IndividualName = {
  id: string;
  name: string | null;
};

class Individual {
  public id: string;
  public name: string | null;
  public birth_place: string | null;
  public parents_family: string | null;
  public own_family: string | null;
  public data: Data;

  public constructor(data: Data) {
    this.data = data;

    this.id = data["xref_id"] as string;
    this.name = data?.["NAME"] as string | null;
    this.birth_place = data?.["BIRTH/PLACE"] as string | null;
    this.parents_family = data?.["@FAMILY_SPOUSE"] as string | null;
    this.own_family = data?.["@FAMILY_CHILD"] as string | null;
  }
}

class Family {
  public id: string;
  public husband: string | null;
  public wife: string | null;
  public children: string[] | null;
  public data: Data;

  public constructor(data: Data) {
    this.data = data;

    this.id = data["xref_id"] as string;

    this.husband = data?.["@HUSBAND"] as string | null;
    this.wife = data?.["@WIFE"] as string | null;

    const mainChild = data?.["@CHILD"] as string;
    const otherChildren = data?.["+@CHILD"] as string[] | null;

    const children = [mainChild, ...(otherChildren ?? [])];
    this.children = children;
  }
}

class GraphResult {
  public node: string;
  public edges: string[];

  constructor(node: string, edges: string[]) {
    this.node = node;
    this.edges = edges;
  }

}

class FamilyGraph {
  public adjacencyList: { [key: string]: string[] };

  constructor(individuals: Individual[], families: Family[]) {
    this.adjacencyList = {};

    for (const family of families) {
      const husband = family.husband;
      const wife = family.wife;
      const children = family.children;

      if (family.id == "@F27@") {
        console.dir(family)
      }

      if (husband && children) {
        for (const child of children) {
          this.addEdge(husband, child);
        }
      }
      if (wife && children) {
        for (const child of children) {
          this.addEdge(wife, child);
        }
      }
    }
  }
  addVertex(vertex: string) {
    if (!this.adjacencyList[vertex]) {
      this.adjacencyList[vertex] = [];
    }
  }
  addEdge(source: string, destination: string) {
    if (!this.adjacencyList[source]) {
      this.addVertex(source);
    }
    if (!this.adjacencyList[destination]) {
      this.addVertex(destination);
    }
    //this.adjacencyList[source].push(destination);
    this.adjacencyList[destination].push(source);
  }
  removeEdge(source: string, destination: string) {
    this.adjacencyList[source] = this.adjacencyList[source].filter(vertex => vertex !== destination);
    this.adjacencyList[destination] = this.adjacencyList[destination].filter(vertex => vertex !== source);
  }
  removeVertex(vertex: string) {
    while (this.adjacencyList[vertex]) {
      const adjacentVertex = this.adjacencyList[vertex].pop();
      this.removeEdge(vertex, adjacentVertex!);
    }
    delete this.adjacencyList[vertex];
  }

  dfsIterative(start: string, limit: number = Infinity) {
    const result = [];
    const stack = [start];
    const visited = {} as { [key: string]: boolean };
    visited[start] = true;
    let currentVertex;
    while (stack.length && result.length < limit) {
      currentVertex = stack.pop();
      result.push(currentVertex);
      this.adjacencyList[currentVertex!].forEach(neighbor => {
        if (!visited[neighbor]) {
          visited[neighbor] = true;
          stack.push(neighbor);
        }
      });
    }
    return result;
  }

  bfs(start: string) {
    const queue = [start];
    const result: GraphResult[] = [];
    const visited = {} as { [key: string]: boolean };
    visited[start] = true;
    let currentVertex: string;
    while (queue.length) {
      currentVertex = queue.shift()!;
      const res: string[] = [];

      this.adjacencyList[currentVertex].forEach(neighbor => {
        if (!visited[neighbor]) {
          visited[neighbor] = true;
          res.push(neighbor);
          queue.push(neighbor);
        }
      });
      result.push(new GraphResult(currentVertex, res));
    }
    return result;
  }


}


export { IndividualName, Individual, Family, FamilyGraph, GraphResult };