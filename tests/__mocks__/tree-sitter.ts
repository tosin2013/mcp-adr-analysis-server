/**
 * Mock implementation of tree-sitter for Jest testing
 *
 * Native tree-sitter modules fail to load in Jest's VM module environment,
 * so we provide a mock that simulates basic tree-sitter functionality.
 */

export class MockParser {
  private language: any = null;

  setLanguage(lang: any): void {
    this.language = lang;
  }

  parse(input: string): any {
    return {
      rootNode: {
        type: 'program',
        text: input,
        startPosition: { row: 0, column: 0 },
        endPosition: { row: input.split('\n').length - 1, column: 0 },
        children: [],
        parent: null,
        namedChildren: [],
        childForFieldName: () => null,
        descendantsOfType: () => [],
        walk: () => ({
          nodeType: 'program',
          nodeText: input,
          gotoFirstChild: () => false,
          gotoNextSibling: () => false,
          gotoParent: () => false,
        }),
      },
    };
  }
}

export default MockParser;
