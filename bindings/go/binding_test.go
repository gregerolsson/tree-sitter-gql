package tree_sitter_gql_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_gql "github.com/tree-sitter/tree-sitter-gql/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_gql.Language())
	if language == nil {
		t.Errorf("Error loading GQL grammar")
	}
}
