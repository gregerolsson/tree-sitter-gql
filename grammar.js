/**
 * @file GQL grammar for tree-sitter (ISO/IEC 39075)
 * @author Greger Olsson <greger.olsson@veriscan.se>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Case-insensitive keyword. Generates a regex like /[Mm][Aa][Tt][Cc][Hh]/.
 * @param {string} word
 */
function ci(word) {
  return new RegExp(
    word
      .split("")
      .map((c) => {
        if (/[a-zA-Z]/.test(c)) return `[${c.toLowerCase()}${c.toUpperCase()}]`;
        return c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join(""),
  );
}

/**
 * Comma-separated list of one or more items.
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)));
}

/**
 * Optional comma-separated list (zero or more).
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
}

// Precedence constants for value expressions (low → high)
const PREC = {
  OR: 1,
  XOR: 1,
  AND: 2,
  NOT: 3,
  IS: 4,
  COMPARISON: 5,
  CONCATENATION: 6,
  ADD: 7,
  MULTIPLY: 8,
  UNARY: 9,
  PROPERTY: 10,
  // Label expression precedence
  LABEL_DISJUNCTION: 1,
  LABEL_CONJUNCTION: 2,
  LABEL_NEGATION: 3,
};

// ---------------------------------------------------------------------------
// Grammar
// ---------------------------------------------------------------------------

export default grammar({
  name: "gql",

  extras: ($) => [/\s+/, $.block_comment, $.line_comment_solidus, $.line_comment_minus],

  conflicts: ($) => [
    // objectExpressionPrimary vs valueExpressionPrimary both start with parenthesized expr
    [$.object_expression_primary, $.parenthesized_value_expression],
    // graphExpression alternatives overlap
    [$.graph_expression],
    // binding table expression alternatives
    [$.binding_table_expression],
    // valueExpression vs predicate overlap
    [$.value_expression, $.null_predicate],
    [$.value_expression, $.value_type_predicate],
    [$.value_expression, $.directed_predicate],
    [$.value_expression, $.labeled_predicate],
    [$.value_expression, $.source_destination_predicate],
    // selectStatement ambiguity
    [$.select_statement],
    // compositeQueryExpression left recursion
    [$.composite_query_expression],
    // node pattern vs parenthesized expression
    [$.node_pattern, $.parenthesized_value_expression],
    // linear query ambiguity
    [$.ambient_linear_query_statement],
    [$.focused_linear_query_statement],
    // data modifying
    [$.ambient_linear_data_modifying_statement],
    [$.ambient_linear_data_modifying_statement_body],
    // procedure spec overlap
    [$.procedure_specification],
    // graph type source
    [$.graph_type_source],
    // create graph statement
    [$.create_graph_statement],
    // of graph type alternatives
    [$.of_graph_type],
    // value type alternatives
    [$.value_type],
    [$.value_type, $.value_type],
    // record type vs field types
    [$.record_type],
    // predefined type vs other
    [$.predefined_type],
    // node type specification
    [$.node_type_pattern],
    [$.node_type_specification],
    // edge type specification
    [$.edge_type_pattern],
    // label set phrase
    [$.label_set_phrase],
    // insert element pattern filler
    [$.insert_element_pattern_filler],
    // label and property set specification
    [$.label_and_property_set_specification],
    // element pattern filler
    [$.element_pattern_filler],
    // path factor
    [$.path_factor],
    // valueExpressionPrimary property access vs set property item
    [$.value_expression_primary],
    // simplified path expressions
    [$.simplified_contents],
    [$.simplified_term],
    [$.simplified_factor_high],
    // statement overlap
    [$.statement],
    // focused statement parts
    [$.focused_linear_query_statement, $.focused_linear_data_modifying_statement],
    // simple linear statements
    [$.simple_linear_data_accessing_statement],
    [$.simple_linear_query_statement],
    [$.simple_data_accessing_statement, $.simple_linear_query_statement],
    // match vs optional match
    [$.match_statement],
    // trim operands
    [$.trim_operands],
    // catalog object parent reference
    [$.catalog_object_parent_reference],
    // graph name vs regular identifier overlap
    [$.graph_name, $.object_name_or_binding_variable],
    [$.binding_table_name, $.object_name_or_binding_variable],
    // graph reference overlap
    [$.graph_reference],
    // binding table reference
    [$.binding_table_reference],
    // when operand
    [$.when_operand],
    // order by and page
    [$.order_by_and_page_statement],
    // non-parenthesized primary vs binding variable ref
    [$.non_parenthesized_value_expression_primary],
    [$.non_parenthesized_value_expression_primary_special_case],
    // edge type pattern directed/undirected
    [$.edge_type_pattern_directed],
    [$.source_node_type_reference],
    [$.destination_node_type_reference],
    // session set parameter clause overlap
    [$.session_set_parameter_clause],
    // simple data accessing statement
    [$.simple_data_accessing_statement],
    // call procedure statement ambiguity (catalog, data, query all wrap call_procedure_statement)
    [$.call_catalog_modifying_procedure_statement, $.call_data_modifying_procedure_statement, $.call_query_statement],
    [$.call_data_modifying_procedure_statement, $.call_query_statement],
    // for item source
    [$.for_item],
    // use graph vs graph expression in select
    [$.select_graph_match],
    // schema reference ambiguity
    [$.schema_reference],
    [$.absolute_catalog_schema_reference],
    // relative directory path
    [$.relative_directory_path],
    // procedure body
    [$.procedure_body],
    // binding variable definition
    [$.binding_variable_definition_block],
    // session set
    [$.session_set_graph_parameter_clause],
    [$.session_set_binding_table_parameter_clause],
    // set time zone
    [$.session_set_time_zone_clause],
    // path pattern expression alternatives
    [$.path_pattern_expression],
    // edge type phrase endpoint
    [$.edge_type_phrase],
    // value expression primary chain
    [$.value_expression, $.value_expression_primary],
    // non-reserved word vs keyword in value_expression
    [$.value_expression, $.non_reserved_word],
    [$.general_set_function, $.general_set_function_type],
    [$.null_predicate, $.value_type_predicate, $.value_expression],
    [$.directed_predicate, $.labeled_predicate, $.source_destination_predicate, $.value_expression_primary],
    [$.numeric_value_function, $.duration_value_function],
    [$.absolute_catalog_schema_reference, $.absolute_directory_path],
    [$.delimited_graph_name, $.character_string_literal],
    [$.delimited_binding_table_name, $.character_string_literal],
    [$.identifier, $.character_string_literal],
    [$.binding_variable, $.identifier],
    [$.signed_binary_exact_numeric_type, $.verbose_binary_exact_numeric_type],
    [$.nested_data_modifying_procedure_specification, $.nested_query_specification],
    [$.create_graph_type_statement, $.non_reserved_word],
    [$.drop_graph_type_statement, $.non_reserved_word],
    [$.create_graph_statement, $.non_reserved_word],
    [$.drop_graph_statement, $.non_reserved_word],
    [$.delimited_graph_name, $.identifier],
    [$.delimited_binding_table_name, $.identifier],
    [$.graph_name, $.identifier],
    [$.binding_table_name, $.identifier],
    [$.schema_reference, $.graph_reference],
    [$.schema_reference, $.binding_table_reference],
    [$.schema_reference, $.graph_type_reference],
    [$.schema_reference, $.procedure_reference],
    [$.non_parenthesized_value_expression_primary, $.case_operand],
    [$.label_set_phrase, $.non_reserved_word],
    [$.node_type_phrase, $.non_reserved_word],
    [$.edge_type_phrase, $.non_reserved_word],
    [$.edge_type_pattern, $.non_reserved_word],
    [$.node_type_pattern, $.non_reserved_word],
    [$.local_node_type_alias, $.source_node_type_reference, $.destination_node_type_reference],
    [$.node_type_pattern, $.node_type_phrase, $.non_reserved_word],
    [$.edge_type_pattern, $.edge_type_phrase, $.non_reserved_word],
    [$.primitive_query_statement, $.match_statement_block],
    [$.cast_specification, $.null_literal],
    [$.result, $.null_literal],
    [$.node_type_phrase, $.open_node_reference_value_type],
    [$.edge_type_phrase, $.open_edge_reference_value_type],
    [$.node_type_pattern, $.open_node_reference_value_type],
    [$.edge_type_pattern, $.open_edge_reference_value_type],
    [$.node_type_pattern, $.node_type_phrase],
    [$.node_type_pattern, $.node_type_phrase, $.open_node_reference_value_type],
    [$.edge_type_pattern, $.edge_type_phrase, $.open_edge_reference_value_type],
    [$.node_type_filler],
    [$.edge_type_filler],
    [$.node_type_phrase_filler],
    [$.edge_type_phrase_filler],
    [$.value_type, $.open_graph_reference_value_type],
    [$.value_type, $.open_node_reference_value_type],
    [$.value_type, $.open_edge_reference_value_type],
    [$.datetime_type, $.local_datetime_type],
    [$.time_type, $.local_time_type],
    [$.node_type_implied_content],
    [$.edge_type_implied_content],
    [$.counted_shortest_path_search, $.counted_shortest_group_search],
    [$.endpoint_pair_directed, $.endpoint_pair_undirected],
  ],

  word: ($) => $.regular_identifier_token,

  rules: {
    // -----------------------------------------------------------------------
    // 6: GQL Program
    // -----------------------------------------------------------------------

    source_file: ($) =>
      choice(
        seq($.program_activity, optional($.session_close_command)),
        $.session_close_command,
      ),

    program_activity: ($) =>
      choice($.session_activity, $.transaction_activity),

    session_activity: ($) =>
      prec.left(choice(
        repeat1($.session_reset_command),
        seq(repeat1($.session_set_command), repeat($.session_reset_command)),
      )),

    transaction_activity: ($) =>
      choice(
        seq(
          $.start_transaction_command,
          optional(
            seq($.procedure_specification, optional($.end_transaction_command)),
          ),
        ),
        seq($.procedure_specification, optional($.end_transaction_command)),
        $.end_transaction_command,
      ),

    end_transaction_command: ($) =>
      choice($.rollback_command, $.commit_command),

    // -----------------------------------------------------------------------
    // 7.1: Session set command
    // -----------------------------------------------------------------------

    session_set_command: ($) =>
      seq(
        ci("SESSION"),
        ci("SET"),
        choice(
          $.session_set_schema_clause,
          $.session_set_graph_clause,
          $.session_set_time_zone_clause,
          $.session_set_parameter_clause,
        ),
      ),

    session_set_schema_clause: ($) =>
      seq(ci("SCHEMA"), $.schema_reference),

    session_set_graph_clause: ($) =>
      seq(optional(ci("PROPERTY")), ci("GRAPH"), $.graph_expression),

    session_set_time_zone_clause: ($) =>
      seq(ci("TIME"), ci("ZONE"), $.character_string_literal),

    session_set_parameter_clause: ($) =>
      choice(
        $.session_set_graph_parameter_clause,
        $.session_set_binding_table_parameter_clause,
        $.session_set_value_parameter_clause,
      ),

    session_set_graph_parameter_clause: ($) =>
      seq(
        optional(ci("PROPERTY")),
        ci("GRAPH"),
        $.session_set_parameter_name,
        $.opt_typed_graph_initializer,
      ),

    session_set_binding_table_parameter_clause: ($) =>
      seq(
        optional(ci("BINDING")),
        ci("TABLE"),
        $.session_set_parameter_name,
        $.opt_typed_binding_table_initializer,
      ),

    session_set_value_parameter_clause: ($) =>
      seq(
        ci("VALUE"),
        $.session_set_parameter_name,
        $.opt_typed_value_initializer,
      ),

    session_set_parameter_name: ($) =>
      seq(
        optional(seq(ci("IF"), ci("NOT"), ci("EXISTS"))),
        $.session_parameter_specification,
      ),

    // 7.2
    session_reset_command: ($) =>
      seq(ci("SESSION"), ci("RESET"), optional($.session_reset_arguments)),

    session_reset_arguments: ($) =>
      choice(
        seq(optional(ci("ALL")), choice(ci("PARAMETERS"), ci("CHARACTERISTICS"))),
        ci("SCHEMA"),
        seq(optional(ci("PROPERTY")), ci("GRAPH")),
        seq(ci("TIME"), ci("ZONE")),
        seq(optional(ci("PARAMETER")), $.session_parameter_specification),
      ),

    // 7.3
    session_close_command: (_$) => seq(ci("SESSION"), ci("CLOSE")),

    // 7.4
    session_parameter_specification: ($) => $.general_parameter_reference,

    // -----------------------------------------------------------------------
    // 8: Transaction commands
    // -----------------------------------------------------------------------

    start_transaction_command: ($) =>
      seq(
        ci("START"),
        ci("TRANSACTION"),
        optional($.transaction_characteristics),
      ),

    transaction_characteristics: ($) =>
      commaSep1($.transaction_mode),

    transaction_mode: ($) => $.transaction_access_mode,

    transaction_access_mode: (_$) =>
      choice(seq(ci("READ"), ci("ONLY")), seq(ci("READ"), ci("WRITE"))),

    rollback_command: (_$) => ci("ROLLBACK"),

    commit_command: (_$) => ci("COMMIT"),

    // -----------------------------------------------------------------------
    // 9: Procedure specification
    // -----------------------------------------------------------------------

    nested_procedure_specification: ($) =>
      seq("{", $.procedure_specification, "}"),

    procedure_specification: ($) => $.procedure_body,

    nested_data_modifying_procedure_specification: ($) =>
      seq("{", $.procedure_body, "}"),

    nested_query_specification: ($) => seq("{", $.procedure_body, "}"),

    // 9.2
    procedure_body: ($) =>
      seq(
        optional($.at_schema_clause),
        optional($.binding_variable_definition_block),
        $.statement_block,
      ),

    binding_variable_definition_block: ($) =>
      repeat1($.binding_variable_definition),

    binding_variable_definition: ($) =>
      choice(
        $.graph_variable_definition,
        $.binding_table_variable_definition,
        $.value_variable_definition,
      ),

    statement_block: ($) => seq($.statement, repeat($.next_statement)),

    statement: ($) =>
      choice(
        $.composite_query_statement,
        $.linear_catalog_modifying_statement,
        $.linear_data_modifying_statement,
      ),

    next_statement: ($) =>
      seq(ci("NEXT"), optional($.yield_clause), $.statement),

    // -----------------------------------------------------------------------
    // 10: Variable definitions
    // -----------------------------------------------------------------------

    graph_variable_definition: ($) =>
      seq(
        optional(ci("PROPERTY")),
        ci("GRAPH"),
        $.binding_variable,
        $.opt_typed_graph_initializer,
      ),

    opt_typed_graph_initializer: ($) =>
      seq(
        optional(seq(optional($.typed), $.graph_reference_value_type)),
        $.graph_initializer,
      ),

    graph_initializer: ($) => seq("=", $.graph_expression),

    binding_table_variable_definition: ($) =>
      seq(
        optional(ci("BINDING")),
        ci("TABLE"),
        $.binding_variable,
        $.opt_typed_binding_table_initializer,
      ),

    opt_typed_binding_table_initializer: ($) =>
      seq(
        optional(
          seq(optional($.typed), $.binding_table_reference_value_type),
        ),
        $.binding_table_initializer,
      ),

    binding_table_initializer: ($) => seq("=", $.binding_table_expression),

    value_variable_definition: ($) =>
      seq(ci("VALUE"), $.binding_variable, $.opt_typed_value_initializer),

    opt_typed_value_initializer: ($) =>
      seq(optional(seq(optional($.typed), $.value_type)), $.value_initializer),

    value_initializer: ($) => seq("=", $.value_expression),

    // -----------------------------------------------------------------------
    // 11: Graph / binding table expressions
    // -----------------------------------------------------------------------

    graph_expression: ($) =>
      choice(
        $.graph_reference,
        $.object_expression_primary,
        $.object_name_or_binding_variable,
        $.current_graph,
      ),

    current_graph: (_$) =>
      choice(ci("CURRENT_PROPERTY_GRAPH"), ci("CURRENT_GRAPH")),

    binding_table_expression: ($) =>
      choice(
        $.nested_query_specification,
        $.binding_table_reference,
        $.object_expression_primary,
        $.object_name_or_binding_variable,
      ),

    object_expression_primary: ($) =>
      choice(
        seq(ci("VARIABLE"), $.value_expression_primary),
        $.parenthesized_value_expression,
        $.non_parenthesized_value_expression_primary_special_case,
      ),

    // -----------------------------------------------------------------------
    // 12: Catalog-modifying statements
    // -----------------------------------------------------------------------

    linear_catalog_modifying_statement: ($) =>
      repeat1($.simple_catalog_modifying_statement),

    simple_catalog_modifying_statement: ($) =>
      choice(
        $.primitive_catalog_modifying_statement,
        $.call_catalog_modifying_procedure_statement,
      ),

    primitive_catalog_modifying_statement: ($) =>
      choice(
        $.create_schema_statement,
        $.drop_schema_statement,
        $.create_graph_statement,
        $.drop_graph_statement,
        $.create_graph_type_statement,
        $.drop_graph_type_statement,
      ),

    create_schema_statement: ($) =>
      seq(
        ci("CREATE"),
        ci("SCHEMA"),
        optional(seq(ci("IF"), ci("NOT"), ci("EXISTS"))),
        $.catalog_schema_parent_and_name,
      ),

    drop_schema_statement: ($) =>
      seq(
        ci("DROP"),
        ci("SCHEMA"),
        optional(seq(ci("IF"), ci("EXISTS"))),
        $.catalog_schema_parent_and_name,
      ),

    create_graph_statement: ($) =>
      seq(
        ci("CREATE"),
        choice(
          seq(
            optional(ci("PROPERTY")),
            ci("GRAPH"),
            optional(seq(ci("IF"), ci("NOT"), ci("EXISTS"))),
          ),
          seq(
            ci("OR"),
            ci("REPLACE"),
            optional(ci("PROPERTY")),
            ci("GRAPH"),
          ),
        ),
        $.catalog_graph_parent_and_name,
        choice($.open_graph_type, $.of_graph_type),
        optional($.graph_source),
      ),

    open_graph_type: ($) =>
      seq(
        optional($.typed),
        ci("ANY"),
        optional(seq(optional(ci("PROPERTY")), ci("GRAPH"))),
      ),

    of_graph_type: ($) =>
      choice(
        $.graph_type_like_graph,
        seq(optional($.typed), $.graph_type_reference),
        seq(
          optional($.typed),
          optional(seq(optional(ci("PROPERTY")), ci("GRAPH"))),
          $.nested_graph_type_specification,
        ),
      ),

    graph_type_like_graph: ($) => seq(ci("LIKE"), $.graph_expression),

    graph_source: ($) => seq(ci("AS"), ci("COPY"), ci("OF"), $.graph_expression),

    drop_graph_statement: ($) =>
      seq(
        ci("DROP"),
        optional(ci("PROPERTY")),
        ci("GRAPH"),
        optional(seq(ci("IF"), ci("EXISTS"))),
        $.catalog_graph_parent_and_name,
      ),

    create_graph_type_statement: ($) =>
      seq(
        ci("CREATE"),
        choice(
          seq(
            optional(ci("PROPERTY")),
            ci("GRAPH"),
            ci("TYPE"),
            optional(seq(ci("IF"), ci("NOT"), ci("EXISTS"))),
          ),
          seq(
            ci("OR"),
            ci("REPLACE"),
            optional(ci("PROPERTY")),
            ci("GRAPH"),
            ci("TYPE"),
          ),
        ),
        $.catalog_graph_type_parent_and_name,
        $.graph_type_source,
      ),

    graph_type_source: ($) =>
      choice(
        seq(optional(ci("AS")), $.copy_of_graph_type),
        $.graph_type_like_graph,
        seq(optional(ci("AS")), $.nested_graph_type_specification),
      ),

    copy_of_graph_type: ($) =>
      seq(ci("COPY"), ci("OF"), $.graph_type_reference),

    drop_graph_type_statement: ($) =>
      seq(
        ci("DROP"),
        optional(ci("PROPERTY")),
        ci("GRAPH"),
        ci("TYPE"),
        optional(seq(ci("IF"), ci("EXISTS"))),
        $.catalog_graph_type_parent_and_name,
      ),

    call_catalog_modifying_procedure_statement: ($) =>
      $.call_procedure_statement,

    // -----------------------------------------------------------------------
    // 13: Data-modifying statements
    // -----------------------------------------------------------------------

    linear_data_modifying_statement: ($) =>
      choice(
        $.focused_linear_data_modifying_statement,
        $.ambient_linear_data_modifying_statement,
      ),

    focused_linear_data_modifying_statement: ($) =>
      choice(
        $.focused_linear_data_modifying_statement_body,
        $.focused_nested_data_modifying_procedure_specification,
      ),

    focused_linear_data_modifying_statement_body: ($) =>
      seq(
        $.use_graph_clause,
        $.simple_linear_data_accessing_statement,
        optional($.primitive_result_statement),
      ),

    focused_nested_data_modifying_procedure_specification: ($) =>
      seq($.use_graph_clause, $.nested_data_modifying_procedure_specification),

    ambient_linear_data_modifying_statement: ($) =>
      choice(
        $.ambient_linear_data_modifying_statement_body,
        $.nested_data_modifying_procedure_specification,
      ),

    ambient_linear_data_modifying_statement_body: ($) =>
      seq(
        $.simple_linear_data_accessing_statement,
        optional($.primitive_result_statement),
      ),

    simple_linear_data_accessing_statement: ($) =>
      repeat1($.simple_data_accessing_statement),

    simple_data_accessing_statement: ($) =>
      choice($.simple_query_statement, $.simple_data_modifying_statement),

    simple_data_modifying_statement: ($) =>
      choice(
        $.primitive_data_modifying_statement,
        $.call_data_modifying_procedure_statement,
      ),

    primitive_data_modifying_statement: ($) =>
      choice(
        $.insert_statement,
        $.set_statement,
        $.remove_statement,
        $.delete_statement,
      ),

    // 13.2
    insert_statement: ($) => seq(ci("INSERT"), $.insert_graph_pattern),

    // 13.3
    set_statement: ($) => seq(ci("SET"), $.set_item_list),

    set_item_list: ($) => commaSep1($.set_item),

    set_item: ($) =>
      choice(
        $.set_property_item,
        $.set_all_properties_item,
        $.set_label_item,
      ),

    set_property_item: ($) =>
      seq(
        $.binding_variable_reference,
        ".",
        $.property_name,
        "=",
        $.value_expression,
      ),

    set_all_properties_item: ($) =>
      seq(
        $.binding_variable_reference,
        "=",
        "{",
        optional($.property_key_value_pair_list),
        "}",
      ),

    set_label_item: ($) =>
      seq($.binding_variable_reference, $.is_or_colon, $.label_name),

    // 13.4
    remove_statement: ($) => seq(ci("REMOVE"), $.remove_item_list),

    remove_item_list: ($) => commaSep1($.remove_item),

    remove_item: ($) =>
      choice($.remove_property_item, $.remove_label_item),

    remove_property_item: ($) =>
      seq($.binding_variable_reference, ".", $.property_name),

    remove_label_item: ($) =>
      seq($.binding_variable_reference, $.is_or_colon, $.label_name),

    // 13.5
    delete_statement: ($) =>
      seq(
        optional(choice(ci("DETACH"), ci("NODETACH"))),
        ci("DELETE"),
        $.delete_item_list,
      ),

    delete_item_list: ($) => commaSep1($.value_expression),

    // 13.6
    call_data_modifying_procedure_statement: ($) =>
      $.call_procedure_statement,

    // -----------------------------------------------------------------------
    // 14: Composite query / linear query / statements
    // -----------------------------------------------------------------------

    // 14.1
    composite_query_statement: ($) => $.composite_query_expression,

    // 14.2
    composite_query_expression: ($) =>
      choice(
        seq(
          $.composite_query_expression,
          $.query_conjunction,
          $.composite_query_primary,
        ),
        $.composite_query_primary,
      ),

    query_conjunction: ($) => choice($.set_operator, ci("OTHERWISE")),

    set_operator: ($) =>
      choice(
        seq(ci("UNION"), optional($.set_quantifier)),
        seq(ci("EXCEPT"), optional($.set_quantifier)),
        seq(ci("INTERSECT"), optional($.set_quantifier)),
      ),

    composite_query_primary: ($) => $.linear_query_statement,

    // 14.3
    linear_query_statement: ($) =>
      choice(
        $.focused_linear_query_statement,
        $.ambient_linear_query_statement,
      ),

    focused_linear_query_statement: ($) =>
      choice(
        seq(
          repeat($.focused_linear_query_statement_part),
          $.focused_linear_query_and_primitive_result_statement_part,
        ),
        $.focused_primitive_result_statement,
        $.focused_nested_query_specification,
        $.select_statement,
      ),

    focused_linear_query_statement_part: ($) =>
      seq($.use_graph_clause, $.simple_linear_query_statement),

    focused_linear_query_and_primitive_result_statement_part: ($) =>
      seq(
        $.use_graph_clause,
        $.simple_linear_query_statement,
        $.primitive_result_statement,
      ),

    focused_primitive_result_statement: ($) =>
      seq($.use_graph_clause, $.primitive_result_statement),

    focused_nested_query_specification: ($) =>
      seq($.use_graph_clause, $.nested_query_specification),

    ambient_linear_query_statement: ($) =>
      choice(
        seq(
          optional($.simple_linear_query_statement),
          $.primitive_result_statement,
        ),
        $.nested_query_specification,
      ),

    simple_linear_query_statement: ($) =>
      repeat1($.simple_query_statement),

    simple_query_statement: ($) =>
      choice($.primitive_query_statement, $.call_query_statement),

    primitive_query_statement: ($) =>
      choice(
        $.match_statement,
        $.let_statement,
        $.for_statement,
        $.filter_statement,
        $.order_by_and_page_statement,
      ),

    // 14.4
    match_statement: ($) =>
      choice($.simple_match_statement, $.optional_match_statement),

    simple_match_statement: ($) =>
      seq(ci("MATCH"), $.graph_pattern_binding_table),

    optional_match_statement: ($) =>
      seq(ci("OPTIONAL"), $.optional_operand),

    optional_operand: ($) =>
      choice(
        $.simple_match_statement,
        seq("{", $.match_statement_block, "}"),
        seq("(", $.match_statement_block, ")"),
      ),

    match_statement_block: ($) => repeat1($.match_statement),

    // 14.5
    call_query_statement: ($) => $.call_procedure_statement,

    // 14.6
    filter_statement: ($) =>
      seq(ci("FILTER"), choice($.where_clause, $.search_condition)),

    // 14.7
    let_statement: ($) =>
      seq(ci("LET"), $.let_variable_definition_list),

    let_variable_definition_list: ($) =>
      commaSep1($.let_variable_definition),

    let_variable_definition: ($) =>
      choice(
        $.value_variable_definition,
        seq($.binding_variable, "=", $.value_expression),
      ),

    // 14.8
    for_statement: ($) =>
      seq(ci("FOR"), $.for_item, optional($.for_ordinality_or_offset)),

    for_item: ($) => seq($.binding_variable, ci("IN"), $.value_expression),

    for_ordinality_or_offset: ($) =>
      seq(
        ci("WITH"),
        choice(ci("ORDINALITY"), ci("OFFSET")),
        $.binding_variable,
      ),

    // 14.9
    order_by_and_page_statement: ($) =>
      choice(
        seq(
          $.order_by_clause,
          optional($.offset_clause),
          optional($.limit_clause),
        ),
        seq($.offset_clause, optional($.limit_clause)),
        $.limit_clause,
      ),

    // 14.10
    primitive_result_statement: ($) =>
      choice(
        seq($.return_statement, optional($.order_by_and_page_statement)),
        ci("FINISH"),
      ),

    // 14.11
    return_statement: ($) => seq(ci("RETURN"), $.return_statement_body),

    return_statement_body: ($) =>
      seq(
        optional($.set_quantifier),
        choice("*", $.return_item_list),
        optional($.group_by_clause),
      ),

    return_item_list: ($) => commaSep1($.return_item),

    return_item: ($) =>
      seq($.value_expression, optional($.return_item_alias)),

    return_item_alias: ($) => seq(ci("AS"), $.identifier),

    // 14.12
    select_statement: ($) =>
      seq(
        ci("SELECT"),
        optional($.set_quantifier),
        choice("*", $.select_item_list),
        optional(
          seq(
            $.select_statement_body,
            optional($.where_clause),
            optional($.group_by_clause),
            optional($.having_clause),
            optional($.order_by_clause),
            optional($.offset_clause),
            optional($.limit_clause),
          ),
        ),
      ),

    select_item_list: ($) => commaSep1($.select_item),

    select_item: ($) =>
      seq($.value_expression, optional(seq(ci("AS"), $.identifier))),

    having_clause: ($) => seq(ci("HAVING"), $.search_condition),

    select_statement_body: ($) =>
      seq(
        ci("FROM"),
        choice($.select_graph_match_list, $.select_query_specification),
      ),

    select_graph_match_list: ($) => commaSep1($.select_graph_match),

    select_graph_match: ($) =>
      seq($.graph_expression, $.match_statement),

    select_query_specification: ($) =>
      choice(
        $.nested_query_specification,
        seq($.graph_expression, $.nested_query_specification),
      ),

    // -----------------------------------------------------------------------
    // 15: Call procedure statement
    // -----------------------------------------------------------------------

    call_procedure_statement: ($) =>
      seq(optional(ci("OPTIONAL")), ci("CALL"), $.procedure_call),

    procedure_call: ($) =>
      choice($.inline_procedure_call, $.named_procedure_call),

    inline_procedure_call: ($) =>
      seq(
        optional($.variable_scope_clause),
        $.nested_procedure_specification,
      ),

    variable_scope_clause: ($) =>
      seq("(", optional($.binding_variable_reference_list), ")"),

    binding_variable_reference_list: ($) =>
      commaSep1($.binding_variable_reference),

    named_procedure_call: ($) =>
      seq(
        $.procedure_reference,
        "(",
        optional($.procedure_argument_list),
        ")",
        optional($.yield_clause),
      ),

    procedure_argument_list: ($) => commaSep1($.value_expression),

    // -----------------------------------------------------------------------
    // 16.1: At schema / use graph
    // -----------------------------------------------------------------------

    at_schema_clause: ($) => seq(ci("AT"), $.schema_reference),

    use_graph_clause: ($) => seq(ci("USE"), $.graph_expression),

    // -----------------------------------------------------------------------
    // 16.3: Graph pattern binding table
    // -----------------------------------------------------------------------

    graph_pattern_binding_table: ($) =>
      seq($.graph_pattern, optional($.graph_pattern_yield_clause)),

    graph_pattern_yield_clause: ($) =>
      prec.right(seq(ci("YIELD"), commaSep1($.binding_variable_reference))),

    // -----------------------------------------------------------------------
    // 16.4: Graph pattern
    // -----------------------------------------------------------------------

    graph_pattern: ($) =>
      prec.right(seq(
        optional($.match_mode),
        $.path_pattern_list,
        optional($.keep_clause),
        optional($.graph_pattern_where_clause),
      )),

    match_mode: ($) =>
      choice(
        $.repeatable_elements_match_mode,
        $.different_edges_match_mode,
      ),

    repeatable_elements_match_mode: ($) =>
      seq(ci("REPEATABLE"), $.element_bindings_or_elements),

    different_edges_match_mode: ($) =>
      seq(ci("DIFFERENT"), $.edge_bindings_or_edges),

    element_bindings_or_elements: (_$) =>
      choice(
        prec(2, seq(ci("ELEMENT"), ci("BINDINGS"))),
        prec(1, ci("ELEMENT")),
        ci("ELEMENTS"),
      ),

    edge_bindings_or_edges: ($) =>
      choice(
        prec(2, seq($.edge_synonym, ci("BINDINGS"))),
        prec(1, $.edge_synonym),
        $.edges_synonym,
      ),

    path_pattern_list: ($) => prec.right(commaSep1($.path_pattern)),

    path_pattern: ($) =>
      seq(
        optional($.path_variable_declaration),
        optional($.path_pattern_prefix),
        $.path_pattern_expression,
      ),

    path_variable_declaration: ($) => seq($.path_variable, "="),

    keep_clause: ($) => seq(ci("KEEP"), $.path_pattern_prefix),

    graph_pattern_where_clause: ($) =>
      seq(ci("WHERE"), $.search_condition),

    // -----------------------------------------------------------------------
    // 16.5: Insert graph pattern
    // -----------------------------------------------------------------------

    insert_graph_pattern: ($) => $.insert_path_pattern_list,

    insert_path_pattern_list: ($) => commaSep1($.insert_path_pattern),

    insert_path_pattern: ($) =>
      seq(
        $.insert_node_pattern,
        repeat(seq($.insert_edge_pattern, $.insert_node_pattern)),
      ),

    insert_node_pattern: ($) =>
      seq("(", optional($.insert_element_pattern_filler), ")"),

    insert_edge_pattern: ($) =>
      choice(
        $.insert_edge_pointing_left,
        $.insert_edge_pointing_right,
        $.insert_edge_undirected,
      ),

    insert_edge_pointing_left: ($) =>
      seq("<-[", optional($.insert_element_pattern_filler), "]-"),

    insert_edge_pointing_right: ($) =>
      seq("-[", optional($.insert_element_pattern_filler), "]->"),

    insert_edge_undirected: ($) =>
      seq("~[", optional($.insert_element_pattern_filler), "]~"),

    insert_element_pattern_filler: ($) =>
      choice(
        seq(
          $.element_variable_declaration,
          optional($.label_and_property_set_specification),
        ),
        $.label_and_property_set_specification,
      ),

    label_and_property_set_specification: ($) =>
      choice(
        seq(
          $.is_or_colon,
          $.label_set_specification,
          optional($.element_property_specification),
        ),
        $.element_property_specification,
      ),

    // -----------------------------------------------------------------------
    // 16.6: Path pattern prefix
    // -----------------------------------------------------------------------

    path_pattern_prefix: ($) =>
      choice($.path_mode_prefix, $.path_search_prefix),

    path_mode_prefix: ($) =>
      seq($.path_mode, optional($.path_or_paths)),

    path_mode: (_$) =>
      choice(ci("WALK"), ci("TRAIL"), ci("SIMPLE"), ci("ACYCLIC")),

    path_search_prefix: ($) =>
      choice(
        $.all_path_search,
        $.any_path_search,
        $.shortest_path_search,
      ),

    all_path_search: ($) =>
      seq(ci("ALL"), optional($.path_mode), optional($.path_or_paths)),

    path_or_paths: (_$) => choice(ci("PATH"), ci("PATHS")),

    any_path_search: ($) =>
      seq(
        ci("ANY"),
        optional($.non_negative_integer_specification),
        optional($.path_mode),
        optional($.path_or_paths),
      ),

    shortest_path_search: ($) =>
      choice(
        $.all_shortest_path_search,
        $.any_shortest_path_search,
        $.counted_shortest_path_search,
        $.counted_shortest_group_search,
      ),

    all_shortest_path_search: ($) =>
      seq(
        ci("ALL"),
        ci("SHORTEST"),
        optional($.path_mode),
        optional($.path_or_paths),
      ),

    any_shortest_path_search: ($) =>
      seq(
        ci("ANY"),
        ci("SHORTEST"),
        optional($.path_mode),
        optional($.path_or_paths),
      ),

    counted_shortest_path_search: ($) =>
      seq(
        ci("SHORTEST"),
        $.non_negative_integer_specification,
        optional($.path_mode),
        optional($.path_or_paths),
      ),

    counted_shortest_group_search: ($) =>
      seq(
        ci("SHORTEST"),
        optional($.non_negative_integer_specification),
        optional($.path_mode),
        optional($.path_or_paths),
        choice(ci("GROUP"), ci("GROUPS")),
      ),

    // -----------------------------------------------------------------------
    // 16.7: Path pattern expression
    // -----------------------------------------------------------------------

    path_pattern_expression: ($) =>
      choice(
        $.path_term,
        seq($.path_term, repeat1(seq("|+|", $.path_term))),
        seq($.path_term, repeat1(seq("|", $.path_term))),
      ),

    path_term: ($) => repeat1($.path_factor),

    path_factor: ($) =>
      choice(
        $.path_primary,
        seq($.path_primary, $.graph_pattern_quantifier),
        seq($.path_primary, "?"),
      ),

    path_primary: ($) =>
      choice(
        $.element_pattern,
        $.parenthesized_path_pattern_expression,
        $.simplified_path_pattern_expression,
      ),

    element_pattern: ($) => choice($.node_pattern, $.edge_pattern),

    node_pattern: ($) => seq("(", optional($.element_pattern_filler), ")"),

    element_pattern_filler: ($) =>
      choice(
        seq(
          $.element_variable_declaration,
          optional($.is_label_expression),
          optional($.element_pattern_predicate),
        ),
        seq($.is_label_expression, optional($.element_pattern_predicate)),
        $.element_pattern_predicate,
      ),

    element_variable_declaration: ($) => $.element_variable,

    is_label_expression: ($) => seq($.is_or_colon, $.label_expression),

    is_or_colon: (_$) => choice(ci("IS"), ":"),

    element_pattern_predicate: ($) =>
      choice(
        $.element_pattern_where_clause,
        $.element_property_specification,
      ),

    element_pattern_where_clause: ($) =>
      seq(ci("WHERE"), $.search_condition),

    element_property_specification: ($) =>
      seq("{", optional($.property_key_value_pair_list), "}"),

    property_key_value_pair_list: ($) =>
      commaSep1($.property_key_value_pair),

    property_key_value_pair: ($) =>
      seq($.property_name, ":", $.value_expression),

    // Edge patterns
    edge_pattern: ($) =>
      choice($.full_edge_pattern, $.abbreviated_edge_pattern),

    full_edge_pattern: ($) =>
      choice(
        $.full_edge_pointing_left,
        $.full_edge_undirected,
        $.full_edge_pointing_right,
        $.full_edge_left_or_undirected,
        $.full_edge_undirected_or_right,
        $.full_edge_left_or_right,
        $.full_edge_any_direction,
      ),

    full_edge_pointing_left: ($) =>
      seq("<-[", $.element_pattern_filler, "]-"),

    full_edge_undirected: ($) =>
      seq("~[", $.element_pattern_filler, "]~"),

    full_edge_pointing_right: ($) =>
      seq("-[", $.element_pattern_filler, "]->"),

    full_edge_left_or_undirected: ($) =>
      seq("<~[", $.element_pattern_filler, "]~"),

    full_edge_undirected_or_right: ($) =>
      seq("~[", $.element_pattern_filler, "]~>"),

    full_edge_left_or_right: ($) =>
      seq("<-[", $.element_pattern_filler, "]->"),

    full_edge_any_direction: ($) =>
      seq("-[", $.element_pattern_filler, "]-"),

    abbreviated_edge_pattern: (_$) =>
      choice("<-", "~", "->", "<~", "~>", "<->", "-"),

    parenthesized_path_pattern_expression: ($) =>
      seq(
        "(",
        optional($.subpath_variable_declaration),
        optional($.path_mode_prefix),
        $.path_pattern_expression,
        optional(seq(ci("WHERE"), $.search_condition)),
        ")",
      ),

    subpath_variable_declaration: ($) =>
      seq($.subpath_variable, "="),

    // -----------------------------------------------------------------------
    // 16.8: Label expression
    // -----------------------------------------------------------------------

    label_expression: ($) =>
      choice(
        prec(PREC.LABEL_NEGATION, seq("!", $.label_expression)),
        prec.left(
          PREC.LABEL_CONJUNCTION,
          seq($.label_expression, "&", $.label_expression),
        ),
        prec.left(
          PREC.LABEL_DISJUNCTION,
          seq($.label_expression, "|", $.label_expression),
        ),
        $.label_name,
        "%",
        seq("(", $.label_expression, ")"),
      ),

    // -----------------------------------------------------------------------
    // 16.11: Graph pattern quantifier
    // -----------------------------------------------------------------------

    graph_pattern_quantifier: ($) =>
      choice(
        "*",
        "+",
        $.fixed_quantifier,
        $.general_quantifier,
      ),

    fixed_quantifier: ($) => seq("{", $.unsigned_integer, "}"),

    general_quantifier: ($) =>
      seq(
        "{",
        optional($.unsigned_integer),
        ",",
        optional($.unsigned_integer),
        "}",
      ),

    // -----------------------------------------------------------------------
    // 16.12: Simplified path pattern expression
    // -----------------------------------------------------------------------

    simplified_path_pattern_expression: ($) =>
      choice(
        seq("<-/", $.simplified_contents, "/-"),
        seq("~/", $.simplified_contents, "/~"),
        seq("-/", $.simplified_contents, "/->"),
        seq("<~/", $.simplified_contents, "/~"),
        seq("~/", $.simplified_contents, "/~>"),
        seq("<-/", $.simplified_contents, "/->"),
        seq("-/", $.simplified_contents, "/-"),
      ),

    simplified_contents: ($) =>
      choice(
        $.simplified_term,
        seq(
          $.simplified_term,
          repeat1(seq("|", $.simplified_term)),
        ),
        seq(
          $.simplified_term,
          repeat1(seq("|+|", $.simplified_term)),
        ),
      ),

    simplified_term: ($) =>
      choice(
        $.simplified_factor_low,
        seq($.simplified_term, $.simplified_factor_low),
      ),

    simplified_factor_low: ($) =>
      choice(
        $.simplified_factor_high,
        seq($.simplified_factor_low, "&", $.simplified_factor_high),
      ),

    simplified_factor_high: ($) =>
      choice(
        $.simplified_tertiary,
        seq($.simplified_tertiary, $.graph_pattern_quantifier),
        seq($.simplified_tertiary, "?"),
      ),

    simplified_tertiary: ($) =>
      choice($.simplified_direction_override, $.simplified_secondary),

    simplified_direction_override: ($) =>
      choice(
        seq("<", $.simplified_secondary),
        seq("~", $.simplified_secondary),
        seq($.simplified_secondary, ">"),
        seq("<~", $.simplified_secondary),
        seq("~", $.simplified_secondary, ">"),
        seq("<", $.simplified_secondary, ">"),
        seq("-", $.simplified_secondary),
      ),

    simplified_secondary: ($) =>
      choice($.simplified_primary, $.simplified_negation),

    simplified_negation: ($) => seq("!", $.simplified_primary),

    simplified_primary: ($) =>
      choice($.label_name, seq("(", $.simplified_contents, ")")),

    // -----------------------------------------------------------------------
    // 16.13-16.19: Clauses
    // -----------------------------------------------------------------------

    where_clause: ($) => seq(ci("WHERE"), $.search_condition),

    yield_clause: ($) => seq(ci("YIELD"), $.yield_item_list),

    yield_item_list: ($) => commaSep1($.yield_item),

    yield_item: ($) =>
      seq($.field_name, optional(seq(ci("AS"), $.binding_variable))),

    group_by_clause: ($) =>
      seq(
        ci("GROUP"),
        ci("BY"),
        choice($.grouping_element_list, $.empty_grouping_set),
      ),

    grouping_element_list: ($) =>
      commaSep1($.binding_variable_reference),

    empty_grouping_set: (_$) => seq("(", ")"),

    order_by_clause: ($) =>
      seq(ci("ORDER"), ci("BY"), $.sort_specification_list),

    sort_specification_list: ($) => commaSep1($.sort_specification),

    sort_specification: ($) =>
      seq(
        $.value_expression,
        optional($.ordering_specification),
        optional($.null_ordering),
      ),

    ordering_specification: (_$) =>
      choice(ci("ASC"), ci("ASCENDING"), ci("DESC"), ci("DESCENDING")),

    null_ordering: (_$) =>
      choice(
        seq(ci("NULLS"), ci("FIRST")),
        seq(ci("NULLS"), ci("LAST")),
      ),

    limit_clause: ($) =>
      seq(ci("LIMIT"), $.non_negative_integer_specification),

    offset_clause: ($) =>
      seq(
        choice(ci("OFFSET"), ci("SKIP")),
        $.non_negative_integer_specification,
      ),

    // -----------------------------------------------------------------------
    // 17: References & catalog navigation
    // -----------------------------------------------------------------------

    schema_reference: ($) =>
      choice(
        $.absolute_catalog_schema_reference,
        $.relative_catalog_schema_reference,
        $.reference_parameter_specification,
      ),

    absolute_catalog_schema_reference: ($) =>
      choice(
        "/",
        seq($.absolute_directory_path, $.schema_name),
      ),

    catalog_schema_parent_and_name: ($) =>
      seq($.absolute_directory_path, $.schema_name),

    relative_catalog_schema_reference: ($) =>
      choice(
        $.predefined_schema_reference,
        seq($.relative_directory_path, $.schema_name),
      ),

    predefined_schema_reference: (_$) =>
      choice(ci("HOME_SCHEMA"), ci("CURRENT_SCHEMA"), "."),

    absolute_directory_path: ($) =>
      prec.right(seq("/", optional($.simple_directory_path))),

    relative_directory_path: ($) =>
      seq(
        "..",
        repeat(seq("/", "..")),
        "/",
        optional($.simple_directory_path),
      ),

    simple_directory_path: ($) =>
      prec.right(repeat1(seq($.directory_name, "/"))),

    graph_reference: ($) =>
      choice(
        seq($.catalog_object_parent_reference, $.graph_name),
        $.delimited_graph_name,
        $.home_graph,
        $.reference_parameter_specification,
      ),

    catalog_graph_parent_and_name: ($) =>
      seq(optional($.catalog_object_parent_reference), $.graph_name),

    home_graph: (_$) =>
      choice(ci("HOME_PROPERTY_GRAPH"), ci("HOME_GRAPH")),

    graph_type_reference: ($) =>
      choice(
        $.catalog_graph_type_parent_and_name,
        $.reference_parameter_specification,
      ),

    catalog_graph_type_parent_and_name: ($) =>
      seq(optional($.catalog_object_parent_reference), $.graph_type_name),

    binding_table_reference: ($) =>
      choice(
        seq($.catalog_object_parent_reference, $.binding_table_name),
        $.delimited_binding_table_name,
        $.reference_parameter_specification,
      ),

    procedure_reference: ($) =>
      choice(
        $.catalog_procedure_parent_and_name,
        $.reference_parameter_specification,
      ),

    catalog_procedure_parent_and_name: ($) =>
      seq(optional($.catalog_object_parent_reference), $.procedure_name),

    catalog_object_parent_reference: ($) =>
      choice(
        seq(
          $.schema_reference,
          optional("/"),
          repeat(seq($.object_name, ".")),
        ),
        repeat1(seq($.object_name, ".")),
      ),

    reference_parameter_specification: ($) =>
      $.substituted_parameter_reference,

    // -----------------------------------------------------------------------
    // 18: Graph type specifications
    // -----------------------------------------------------------------------

    nested_graph_type_specification: ($) =>
      seq("{", $.graph_type_specification_body, "}"),

    graph_type_specification_body: ($) => $.element_type_list,

    element_type_list: ($) =>
      commaSep1($.element_type_specification),

    element_type_specification: ($) =>
      choice($.node_type_specification, $.edge_type_specification),

    // 18.2
    node_type_specification: ($) =>
      choice($.node_type_pattern, $.node_type_phrase),

    node_type_pattern: ($) =>
      seq(
        optional(
          seq($.node_synonym, optional(ci("TYPE")), optional($.node_type_name)),
        ),
        "(",
        optional($.local_node_type_alias),
        optional($.node_type_filler),
        ")",
      ),

    node_type_phrase: ($) =>
      prec.right(seq(
        $.node_synonym,
        optional(ci("TYPE")),
        $.node_type_phrase_filler,
        optional(seq(ci("AS"), $.local_node_type_alias)),
      )),

    node_type_phrase_filler: ($) =>
      choice(
        seq($.node_type_name, optional($.node_type_filler)),
        $.node_type_filler,
      ),

    node_type_filler: ($) =>
      choice(
        seq($.node_type_key_label_set, optional($.node_type_implied_content)),
        $.node_type_implied_content,
      ),

    local_node_type_alias: ($) => $.regular_identifier,

    node_type_implied_content: ($) =>
      choice(
        seq($.label_set_phrase, optional($.property_types_specification)),
        $.property_types_specification,
      ),

    node_type_key_label_set: ($) =>
      seq(optional($.label_set_phrase), $.implies),

    // 18.3
    edge_type_specification: ($) =>
      choice($.edge_type_pattern, $.edge_type_phrase),

    edge_type_pattern: ($) =>
      seq(
        optional(
          seq(
            optional($.edge_kind),
            $.edge_synonym,
            optional(ci("TYPE")),
            optional($.edge_type_name),
          ),
        ),
        choice(
          $.edge_type_pattern_directed,
          $.edge_type_pattern_undirected,
        ),
      ),

    edge_type_phrase: ($) =>
      seq(
        $.edge_kind,
        $.edge_synonym,
        optional(ci("TYPE")),
        $.edge_type_phrase_filler,
        $.endpoint_pair_phrase,
      ),

    edge_type_phrase_filler: ($) =>
      choice(
        seq($.edge_type_name, optional($.edge_type_filler)),
        $.edge_type_filler,
      ),

    edge_type_filler: ($) =>
      choice(
        seq($.edge_type_key_label_set, optional($.edge_type_implied_content)),
        $.edge_type_implied_content,
      ),

    edge_type_implied_content: ($) =>
      choice(
        seq($.label_set_phrase, optional($.property_types_specification)),
        $.property_types_specification,
      ),

    edge_type_key_label_set: ($) =>
      seq(optional($.label_set_phrase), $.implies),

    edge_type_pattern_directed: ($) =>
      choice(
        $.edge_type_pattern_pointing_right,
        $.edge_type_pattern_pointing_left,
      ),

    edge_type_pattern_pointing_right: ($) =>
      seq(
        $.source_node_type_reference,
        seq("-[", $.edge_type_filler, "]->"),
        $.destination_node_type_reference,
      ),

    edge_type_pattern_pointing_left: ($) =>
      seq(
        $.destination_node_type_reference,
        seq("<-[", $.edge_type_filler, "]-"),
        $.source_node_type_reference,
      ),

    edge_type_pattern_undirected: ($) =>
      seq(
        $.source_node_type_reference,
        seq("~[", $.edge_type_filler, "]~"),
        $.destination_node_type_reference,
      ),

    source_node_type_reference: ($) =>
      choice(
        seq("(", $.regular_identifier, ")"),
        seq("(", optional($.node_type_filler), ")"),
      ),

    destination_node_type_reference: ($) =>
      choice(
        seq("(", $.regular_identifier, ")"),
        seq("(", optional($.node_type_filler), ")"),
      ),

    edge_kind: (_$) => choice(ci("DIRECTED"), ci("UNDIRECTED")),

    endpoint_pair_phrase: ($) =>
      seq(ci("CONNECTING"), $.endpoint_pair),

    endpoint_pair: ($) =>
      choice($.endpoint_pair_directed, $.endpoint_pair_undirected),

    endpoint_pair_directed: ($) =>
      choice(
        seq(
          "(",
          $.regular_identifier,
          choice(ci("TO"), "->"),
          $.regular_identifier,
          ")",
        ),
        seq(
          "(",
          $.regular_identifier,
          "<-",
          $.regular_identifier,
          ")",
        ),
      ),

    endpoint_pair_undirected: ($) =>
      seq(
        "(",
        $.regular_identifier,
        choice(ci("TO"), "~"),
        $.regular_identifier,
        ")",
      ),

    // 18.4
    label_set_phrase: ($) =>
      choice(
        seq(ci("LABEL"), $.label_name),
        seq(ci("LABELS"), $.label_set_specification),
        seq($.is_or_colon, $.label_set_specification),
      ),

    label_set_specification: ($) =>
      seq($.label_name, repeat(seq("&", $.label_name))),

    // 18.5
    property_types_specification: ($) =>
      seq("{", optional($.property_type_list), "}"),

    property_type_list: ($) => commaSep1($.property_type),

    property_type: ($) =>
      seq($.property_name, optional($.typed), $.value_type),

    // 18.8
    binding_table_type: ($) =>
      seq(
        optional(ci("BINDING")),
        ci("TABLE"),
        $.field_types_specification,
      ),

    // -----------------------------------------------------------------------
    // 18.9: Value type
    // -----------------------------------------------------------------------

    value_type: ($) =>
      choice(
        $.predefined_type,
        $.path_value_type,
        // LIST<type>[max] NOT NULL
        seq(
          $.list_value_type_name,
          "<",
          $.value_type,
          ">",
          optional(seq("[", $.unsigned_integer, "]")),
          optional($.not_null),
        ),
        // type LIST[max] NOT NULL
        seq(
          $.value_type,
          $.list_value_type_name,
          optional(seq("[", $.unsigned_integer, "]")),
          optional($.not_null),
        ),
        // LIST[max] NOT NULL
        seq(
          $.list_value_type_name,
          optional(seq("[", $.unsigned_integer, "]")),
          optional($.not_null),
        ),
        $.record_type,
        // ANY VALUE? NOT NULL?
        seq(ci("ANY"), optional(ci("VALUE")), optional($.not_null)),
        // ANY? PROPERTY VALUE NOT NULL?
        seq(
          optional(ci("ANY")),
          ci("PROPERTY"),
          ci("VALUE"),
          optional($.not_null),
        ),
        // closed dynamic union: ANY VALUE? <type | type>
        seq(
          ci("ANY"),
          optional(ci("VALUE")),
          "<",
          $.value_type,
          repeat1(seq("|", $.value_type)),
          ">",
        ),
        // closed dynamic union: type | type
        prec.left(seq($.value_type, "|", $.value_type)),
      ),

    typed: (_$) => choice("::", ci("TYPED")),

    predefined_type: ($) =>
      choice(
        $.boolean_type,
        $.character_string_type,
        $.byte_string_type,
        $.numeric_type,
        $.temporal_type,
        $.reference_value_type,
        $.immaterial_value_type,
      ),

    boolean_type: ($) =>
      seq(choice(ci("BOOL"), ci("BOOLEAN")), optional($.not_null)),

    character_string_type: ($) =>
      choice(
        seq(
          ci("STRING"),
          optional(
            seq(
              "(",
              optional(seq($.unsigned_integer, ",")),
              $.unsigned_integer,
              ")",
            ),
          ),
          optional($.not_null),
        ),
        seq(
          ci("CHAR"),
          optional(seq("(", $.unsigned_integer, ")")),
          optional($.not_null),
        ),
        seq(
          ci("VARCHAR"),
          optional(seq("(", $.unsigned_integer, ")")),
          optional($.not_null),
        ),
      ),

    byte_string_type: ($) =>
      choice(
        seq(
          ci("BYTES"),
          optional(
            seq(
              "(",
              optional(seq($.unsigned_integer, ",")),
              $.unsigned_integer,
              ")",
            ),
          ),
          optional($.not_null),
        ),
        seq(
          ci("BINARY"),
          optional(seq("(", $.unsigned_integer, ")")),
          optional($.not_null),
        ),
        seq(
          ci("VARBINARY"),
          optional(seq("(", $.unsigned_integer, ")")),
          optional($.not_null),
        ),
      ),

    numeric_type: ($) =>
      choice($.exact_numeric_type, $.approximate_numeric_type),

    exact_numeric_type: ($) =>
      choice($.binary_exact_numeric_type, $.decimal_exact_numeric_type),

    binary_exact_numeric_type: ($) =>
      choice(
        $.signed_binary_exact_numeric_type,
        $.unsigned_binary_exact_numeric_type,
      ),

    signed_binary_exact_numeric_type: ($) =>
      choice(
        seq(ci("INT8"), optional($.not_null)),
        seq(ci("INT16"), optional($.not_null)),
        seq(ci("INT32"), optional($.not_null)),
        seq(ci("INT64"), optional($.not_null)),
        seq(ci("INT128"), optional($.not_null)),
        seq(ci("INT256"), optional($.not_null)),
        seq(ci("INTEGER8"), optional($.not_null)),
        seq(ci("INTEGER16"), optional($.not_null)),
        seq(ci("INTEGER32"), optional($.not_null)),
        seq(ci("INTEGER64"), optional($.not_null)),
        seq(ci("INTEGER128"), optional($.not_null)),
        seq(ci("INTEGER256"), optional($.not_null)),
        seq(ci("SMALLINT"), optional($.not_null)),
        seq(
          ci("INT"),
          optional(seq("(", $.unsigned_decimal_integer, ")")),
          optional($.not_null),
        ),
        seq(ci("BIGINT"), optional($.not_null)),
        seq(optional(ci("SIGNED")), $.verbose_binary_exact_numeric_type),
        seq(ci("SMALL"), ci("INTEGER"), optional($.not_null)),
        seq(
          ci("INTEGER"),
          optional(seq("(", $.unsigned_decimal_integer, ")")),
          optional($.not_null),
        ),
        seq(ci("BIG"), ci("INTEGER"), optional($.not_null)),
      ),

    unsigned_binary_exact_numeric_type: ($) =>
      choice(
        seq(ci("UINT8"), optional($.not_null)),
        seq(ci("UINT16"), optional($.not_null)),
        seq(ci("UINT32"), optional($.not_null)),
        seq(ci("UINT64"), optional($.not_null)),
        seq(ci("UINT128"), optional($.not_null)),
        seq(ci("UINT256"), optional($.not_null)),
        seq(ci("USMALLINT"), optional($.not_null)),
        seq(
          ci("UINT"),
          optional(seq("(", $.unsigned_decimal_integer, ")")),
          optional($.not_null),
        ),
        seq(ci("UBIGINT"), optional($.not_null)),
        seq(ci("UNSIGNED"), $.verbose_binary_exact_numeric_type),
      ),

    verbose_binary_exact_numeric_type: ($) =>
      choice(
        seq(ci("INTEGER8"), optional($.not_null)),
        seq(ci("INTEGER16"), optional($.not_null)),
        seq(ci("INTEGER32"), optional($.not_null)),
        seq(ci("INTEGER64"), optional($.not_null)),
        seq(ci("INTEGER128"), optional($.not_null)),
        seq(ci("INTEGER256"), optional($.not_null)),
        seq(ci("SMALL"), ci("INTEGER"), optional($.not_null)),
        seq(
          ci("INTEGER"),
          optional(seq("(", $.unsigned_decimal_integer, ")")),
          optional($.not_null),
        ),
        seq(ci("BIG"), ci("INTEGER"), optional($.not_null)),
      ),

    decimal_exact_numeric_type: ($) =>
      seq(
        choice(ci("DECIMAL"), ci("DEC")),
        optional(
          seq(
            "(",
            $.unsigned_decimal_integer,
            optional(seq(",", $.unsigned_decimal_integer)),
            ")",
            optional($.not_null),
          ),
        ),
      ),

    approximate_numeric_type: ($) =>
      choice(
        seq(ci("FLOAT16"), optional($.not_null)),
        seq(ci("FLOAT32"), optional($.not_null)),
        seq(ci("FLOAT64"), optional($.not_null)),
        seq(ci("FLOAT128"), optional($.not_null)),
        seq(ci("FLOAT256"), optional($.not_null)),
        seq(
          ci("FLOAT"),
          optional(
            seq(
              "(",
              $.unsigned_decimal_integer,
              optional(seq(",", $.unsigned_decimal_integer)),
              ")",
            ),
          ),
          optional($.not_null),
        ),
        seq(ci("REAL"), optional($.not_null)),
        seq(ci("DOUBLE"), optional(ci("PRECISION")), optional($.not_null)),
      ),

    temporal_type: ($) =>
      choice($.temporal_instant_type, $.temporal_duration_type),

    temporal_instant_type: ($) =>
      choice(
        $.datetime_type,
        $.local_datetime_type,
        $.date_type,
        $.time_type,
        $.local_time_type,
      ),

    datetime_type: ($) =>
      choice(
        seq(ci("ZONED"), ci("DATETIME"), optional($.not_null)),
        seq(
          ci("TIMESTAMP"),
          ci("WITH"),
          ci("TIME"),
          ci("ZONE"),
          optional($.not_null),
        ),
      ),

    local_datetime_type: ($) =>
      choice(
        seq(ci("LOCAL"), ci("DATETIME"), optional($.not_null)),
        seq(
          ci("TIMESTAMP"),
          optional(seq(ci("WITHOUT"), ci("TIME"), ci("ZONE"))),
          optional($.not_null),
        ),
      ),

    date_type: ($) => seq(ci("DATE"), optional($.not_null)),

    time_type: ($) =>
      choice(
        seq(ci("ZONED"), ci("TIME"), optional($.not_null)),
        seq(
          ci("TIME"),
          ci("WITH"),
          ci("TIME"),
          ci("ZONE"),
          optional($.not_null),
        ),
      ),

    local_time_type: ($) =>
      choice(
        seq(ci("LOCAL"), ci("TIME"), optional($.not_null)),
        seq(
          ci("TIME"),
          ci("WITHOUT"),
          ci("TIME"),
          ci("ZONE"),
          optional($.not_null),
        ),
      ),

    temporal_duration_type: ($) =>
      seq(
        ci("DURATION"),
        "(",
        $.temporal_duration_qualifier,
        ")",
        optional($.not_null),
      ),

    temporal_duration_qualifier: (_$) =>
      choice(
        seq(ci("YEAR"), ci("TO"), ci("MONTH")),
        seq(ci("DAY"), ci("TO"), ci("SECOND")),
      ),

    reference_value_type: ($) =>
      choice(
        $.graph_reference_value_type,
        $.binding_table_reference_value_type,
        $.node_reference_value_type,
        $.edge_reference_value_type,
      ),

    immaterial_value_type: ($) =>
      choice($.null_type, $.empty_type),

    null_type: (_$) => ci("NULL"),

    empty_type: ($) =>
      choice(seq(ci("NULL"), $.not_null), ci("NOTHING")),

    graph_reference_value_type: ($) =>
      choice(
        $.open_graph_reference_value_type,
        $.closed_graph_reference_value_type,
      ),

    closed_graph_reference_value_type: ($) =>
      seq(
        optional(ci("PROPERTY")),
        ci("GRAPH"),
        $.nested_graph_type_specification,
        optional($.not_null),
      ),

    open_graph_reference_value_type: ($) =>
      seq(
        ci("ANY"),
        optional(ci("PROPERTY")),
        ci("GRAPH"),
        optional($.not_null),
      ),

    binding_table_reference_value_type: ($) =>
      seq($.binding_table_type, optional($.not_null)),

    node_reference_value_type: ($) =>
      choice(
        $.open_node_reference_value_type,
        $.closed_node_reference_value_type,
      ),

    closed_node_reference_value_type: ($) =>
      seq($.node_type_specification, optional($.not_null)),

    open_node_reference_value_type: ($) =>
      seq(optional(ci("ANY")), $.node_synonym, optional($.not_null)),

    edge_reference_value_type: ($) =>
      choice(
        $.open_edge_reference_value_type,
        $.closed_edge_reference_value_type,
      ),

    closed_edge_reference_value_type: ($) =>
      seq($.edge_type_specification, optional($.not_null)),

    open_edge_reference_value_type: ($) =>
      seq(optional(ci("ANY")), $.edge_synonym, optional($.not_null)),

    path_value_type: ($) => seq(ci("PATH"), optional($.not_null)),

    list_value_type_name: (_$) => choice(ci("LIST"), ci("ARRAY")),

    record_type: ($) =>
      choice(
        seq(optional(ci("ANY")), ci("RECORD"), optional($.not_null)),
        seq(
          optional(ci("RECORD")),
          $.field_types_specification,
          optional($.not_null),
        ),
      ),

    field_types_specification: ($) =>
      seq("{", optional($.field_type_list), "}"),

    field_type_list: ($) => commaSep1($.field_type),

    not_null: (_$) => seq(ci("NOT"), ci("NULL")),

    field_type: ($) =>
      seq($.field_name, optional($.typed), $.value_type),

    // -----------------------------------------------------------------------
    // 19: Search condition & predicates
    // -----------------------------------------------------------------------

    search_condition: ($) => $.value_expression,

    predicate: ($) =>
      choice(
        $.exists_predicate,
        $.null_predicate,
        $.value_type_predicate,
        $.directed_predicate,
        $.labeled_predicate,
        $.source_destination_predicate,
        $.all_different_predicate,
        $.same_predicate,
        $.property_exists_predicate,
      ),

    comp_op: (_$) =>
      choice("=", "<>", "<", ">", "<=", ">="),

    exists_predicate: ($) =>
      seq(
        ci("EXISTS"),
        choice(
          seq("{", $.graph_pattern, "}"),
          seq("(", $.graph_pattern, ")"),
          seq("{", $.match_statement_block, "}"),
          seq("(", $.match_statement_block, ")"),
          $.nested_query_specification,
        ),
      ),

    null_predicate: ($) =>
      seq(
        $.value_expression_primary,
        ci("IS"),
        optional(ci("NOT")),
        ci("NULL"),
      ),

    value_type_predicate: ($) =>
      seq(
        $.value_expression_primary,
        ci("IS"),
        optional(ci("NOT")),
        $.typed,
        $.value_type,
      ),

    directed_predicate: ($) =>
      seq(
        $.binding_variable_reference,
        ci("IS"),
        optional(ci("NOT")),
        ci("DIRECTED"),
      ),

    labeled_predicate: ($) =>
      seq(
        $.binding_variable_reference,
        $.is_labeled_or_colon,
        $.label_expression,
      ),

    is_labeled_or_colon: (_$) =>
      choice(
        seq(ci("IS"), optional(ci("NOT")), ci("LABELED")),
        ":",
      ),

    source_destination_predicate: ($) =>
      choice(
        seq(
          $.binding_variable_reference,
          ci("IS"),
          optional(ci("NOT")),
          ci("SOURCE"),
          ci("OF"),
          $.binding_variable_reference,
        ),
        seq(
          $.binding_variable_reference,
          ci("IS"),
          optional(ci("NOT")),
          ci("DESTINATION"),
          ci("OF"),
          $.binding_variable_reference,
        ),
      ),

    all_different_predicate: ($) =>
      seq(
        ci("ALL_DIFFERENT"),
        "(",
        $.binding_variable_reference,
        ",",
        $.binding_variable_reference,
        repeat(seq(",", $.binding_variable_reference)),
        ")",
      ),

    same_predicate: ($) =>
      seq(
        ci("SAME"),
        "(",
        $.binding_variable_reference,
        ",",
        $.binding_variable_reference,
        repeat(seq(",", $.binding_variable_reference)),
        ")",
      ),

    property_exists_predicate: ($) =>
      seq(
        ci("PROPERTY_EXISTS"),
        "(",
        $.binding_variable_reference,
        ",",
        $.property_name,
        ")",
      ),

    // -----------------------------------------------------------------------
    // 20: Value expressions
    // -----------------------------------------------------------------------

    value_expression: ($) =>
      choice(
        // Unary sign
        prec.right(
          PREC.UNARY,
          seq(choice("+", "-"), $.value_expression),
        ),
        // Multiplicative
        prec.left(
          PREC.MULTIPLY,
          seq(
            $.value_expression,
            choice("*", "/"),
            $.value_expression,
          ),
        ),
        // Additive
        prec.left(
          PREC.ADD,
          seq(
            $.value_expression,
            choice("+", "-"),
            $.value_expression,
          ),
        ),
        // Concatenation
        prec.left(
          PREC.CONCATENATION,
          seq($.value_expression, "||", $.value_expression),
        ),
        // Comparison
        prec.left(
          PREC.COMPARISON,
          seq($.value_expression, $.comp_op, $.value_expression),
        ),
        // Predicates
        $.predicate,
        // Normalized predicate
        prec.left(
          PREC.IS,
          seq(
            $.value_expression,
            ci("IS"),
            optional(ci("NOT")),
            optional($.normal_form),
            ci("NORMALIZED"),
          ),
        ),
        // NOT
        prec.right(PREC.NOT, seq(ci("NOT"), $.value_expression)),
        // IS [NOT] truth value
        prec.left(
          PREC.IS,
          seq(
            $.value_expression,
            ci("IS"),
            optional(ci("NOT")),
            $.truth_value,
          ),
        ),
        // AND
        prec.left(
          PREC.AND,
          seq($.value_expression, ci("AND"), $.value_expression),
        ),
        // OR / XOR
        prec.left(
          PREC.OR,
          seq(
            $.value_expression,
            choice(ci("OR"), ci("XOR")),
            $.value_expression,
          ),
        ),
        // PROPERTY? GRAPH graphExpression
        seq(
          optional(ci("PROPERTY")),
          ci("GRAPH"),
          $.graph_expression,
        ),
        // BINDING? TABLE bindingTableExpression
        seq(
          optional(ci("BINDING")),
          ci("TABLE"),
          $.binding_table_expression,
        ),
        // Value functions
        $.value_function,
        // Primary
        $.value_expression_primary,
      ),

    value_function: ($) =>
      choice(
        $.numeric_value_function,
        $.datetime_subtraction,
        $.datetime_value_function,
        $.duration_value_function,
        $.character_or_byte_string_function,
        $.list_value_function,
      ),

    // -----------------------------------------------------------------------
    // 20.2: Value expression primary
    // -----------------------------------------------------------------------

    value_expression_primary: ($) =>
      choice(
        $.parenthesized_value_expression,
        $.aggregate_function,
        $.unsigned_value_specification,
        $.path_value_constructor,
        prec.left(
          PREC.PROPERTY,
          seq($.value_expression_primary, ".", $.property_name),
        ),
        $.value_query_expression,
        $.case_expression,
        $.cast_specification,
        $.element_id_function,
        $.let_value_expression,
        $.binding_variable_reference,
      ),

    parenthesized_value_expression: ($) =>
      seq("(", $.value_expression, ")"),

    non_parenthesized_value_expression_primary: ($) =>
      choice(
        $.non_parenthesized_value_expression_primary_special_case,
        $.binding_variable_reference,
      ),

    non_parenthesized_value_expression_primary_special_case: ($) =>
      choice(
        $.aggregate_function,
        $.unsigned_value_specification,
        $.path_value_constructor,
        seq($.value_expression_primary, ".", $.property_name),
        $.value_query_expression,
        $.case_expression,
        $.cast_specification,
        $.element_id_function,
        $.let_value_expression,
      ),

    // 20.3
    unsigned_value_specification: ($) =>
      choice($.unsigned_literal, $.general_value_specification),

    non_negative_integer_specification: ($) =>
      choice($.unsigned_integer, $.general_parameter_reference),

    general_value_specification: ($) =>
      choice($.general_parameter_reference, ci("SESSION_USER")),

    // 20.5
    let_value_expression: ($) =>
      seq(
        ci("LET"),
        $.let_variable_definition_list,
        ci("IN"),
        $.value_expression,
        ci("END"),
      ),

    // 20.6
    value_query_expression: ($) =>
      seq(ci("VALUE"), $.nested_query_specification),

    // 20.7
    case_expression: ($) =>
      choice($.case_abbreviation, $.case_specification),

    case_abbreviation: ($) =>
      choice(
        seq(
          ci("NULLIF"),
          "(",
          $.value_expression,
          ",",
          $.value_expression,
          ")",
        ),
        seq(
          ci("COALESCE"),
          "(",
          $.value_expression,
          repeat1(seq(",", $.value_expression)),
          ")",
        ),
      ),

    case_specification: ($) =>
      choice($.simple_case, $.searched_case),

    simple_case: ($) =>
      seq(
        ci("CASE"),
        $.case_operand,
        repeat1($.simple_when_clause),
        optional($.else_clause),
        ci("END"),
      ),

    searched_case: ($) =>
      seq(
        ci("CASE"),
        repeat1($.searched_when_clause),
        optional($.else_clause),
        ci("END"),
      ),

    simple_when_clause: ($) =>
      seq(ci("WHEN"), $.when_operand_list, ci("THEN"), $.result),

    searched_when_clause: ($) =>
      seq(ci("WHEN"), $.search_condition, ci("THEN"), $.result),

    else_clause: ($) => seq(ci("ELSE"), $.result),

    case_operand: ($) =>
      choice(
        $.non_parenthesized_value_expression_primary,
        $.binding_variable_reference,
      ),

    when_operand_list: ($) => commaSep1($.when_operand),

    when_operand: ($) =>
      choice(
        $.non_parenthesized_value_expression_primary,
        seq($.comp_op, $.value_expression),
        seq(ci("IS"), optional(ci("NOT")), ci("NULL")),
        seq(ci("IS"), optional(ci("NOT")), $.typed, $.value_type),
        seq(
          ci("IS"),
          optional(ci("NOT")),
          optional($.normal_form),
          ci("NORMALIZED"),
        ),
        seq(ci("IS"), optional(ci("NOT")), ci("DIRECTED")),
        seq(
          choice(
            seq(ci("IS"), optional(ci("NOT")), ci("LABELED")),
            ":",
          ),
          $.label_expression,
        ),
        seq(
          ci("IS"),
          optional(ci("NOT")),
          ci("SOURCE"),
          ci("OF"),
          $.binding_variable_reference,
        ),
        seq(
          ci("IS"),
          optional(ci("NOT")),
          ci("DESTINATION"),
          ci("OF"),
          $.binding_variable_reference,
        ),
      ),

    result: ($) =>
      choice($.value_expression, ci("NULL")),

    // 20.8
    cast_specification: ($) =>
      seq(
        ci("CAST"),
        "(",
        choice($.value_expression, ci("NULL")),
        ci("AS"),
        $.value_type,
        ")",
      ),

    // 20.9
    aggregate_function: ($) =>
      choice(
        $.general_set_function,
        $.binary_set_function,
      ),

    general_set_function: ($) =>
      choice(
        seq(ci("COUNT"), "(", "*", ")"),
        seq(
          $.general_set_function_type,
          "(",
          optional($.set_quantifier),
          $.value_expression,
          ")",
        ),
      ),

    binary_set_function: ($) =>
      seq(
        $.binary_set_function_type,
        "(",
        optional($.set_quantifier),
        $.value_expression,
        ",",
        $.value_expression,
        ")",
      ),

    general_set_function_type: (_$) =>
      choice(
        ci("AVG"),
        ci("COUNT"),
        ci("MAX"),
        ci("MIN"),
        ci("SUM"),
        ci("COLLECT_LIST"),
        ci("STDDEV_SAMP"),
        ci("STDDEV_POP"),
      ),

    set_quantifier: (_$) => choice(ci("DISTINCT"), ci("ALL")),

    binary_set_function_type: (_$) =>
      choice(ci("PERCENTILE_CONT"), ci("PERCENTILE_DISC")),

    // 20.10
    element_id_function: ($) =>
      seq(ci("ELEMENT_ID"), "(", $.binding_variable_reference, ")"),

    // 20.12
    binding_variable_reference: ($) => $.binding_variable,

    // 20.14
    path_value_constructor: ($) =>
      seq(
        ci("PATH"),
        "[",
        $.value_expression_primary,
        repeat(
          seq(",", $.value_expression_primary, ",", $.value_expression_primary),
        ),
        "]",
      ),

    // 20.16
    list_value_function: ($) =>
      choice($.trim_list_function, $.elements_function),

    trim_list_function: ($) =>
      seq(
        ci("TRIM"),
        "(",
        $.value_expression,
        ",",
        $.value_expression,
        ")",
      ),

    elements_function: ($) =>
      seq(ci("ELEMENTS"), "(", $.value_expression, ")"),

    // 20.17
    list_value_constructor_by_enumeration: ($) =>
      seq(
        optional($.list_value_type_name),
        "[",
        optional(commaSep1($.value_expression)),
        "]",
      ),

    // 20.18
    record_constructor: ($) =>
      seq(optional(ci("RECORD")), "{", optional($.field_list), "}"),

    field_list: ($) => commaSep1($.field),

    field: ($) => seq($.field_name, ":", $.value_expression),

    // 20.20
    truth_value: ($) => $.boolean_literal,

    // 20.22
    numeric_value_function: ($) =>
      choice(
        $.length_expression,
        $.cardinality_expression,
        $.absolute_value_expression,
        $.modulus_expression,
        $.trigonometric_function,
        $.general_logarithm_function,
        $.common_logarithm,
        $.natural_logarithm,
        $.exponential_function,
        $.power_function,
        $.square_root,
        $.floor_function,
        $.ceiling_function,
      ),

    length_expression: ($) =>
      choice(
        seq(
          choice(ci("CHAR_LENGTH"), ci("CHARACTER_LENGTH")),
          "(",
          $.value_expression,
          ")",
        ),
        seq(
          choice(ci("BYTE_LENGTH"), ci("OCTET_LENGTH")),
          "(",
          $.value_expression,
          ")",
        ),
        seq(ci("PATH_LENGTH"), "(", $.value_expression, ")"),
      ),

    cardinality_expression: ($) =>
      choice(
        seq(ci("CARDINALITY"), "(", $.value_expression, ")"),
        seq(ci("SIZE"), "(", $.value_expression, ")"),
      ),

    absolute_value_expression: ($) =>
      seq(ci("ABS"), "(", $.value_expression, ")"),

    modulus_expression: ($) =>
      seq(
        ci("MOD"),
        "(",
        $.value_expression,
        ",",
        $.value_expression,
        ")",
      ),

    trigonometric_function: ($) =>
      seq($.trigonometric_function_name, "(", $.value_expression, ")"),

    trigonometric_function_name: (_$) =>
      choice(
        ci("SIN"),
        ci("COS"),
        ci("TAN"),
        ci("COT"),
        ci("SINH"),
        ci("COSH"),
        ci("TANH"),
        ci("ASIN"),
        ci("ACOS"),
        ci("ATAN"),
        ci("DEGREES"),
        ci("RADIANS"),
      ),

    general_logarithm_function: ($) =>
      seq(
        ci("LOG"),
        "(",
        $.value_expression,
        ",",
        $.value_expression,
        ")",
      ),

    common_logarithm: ($) =>
      seq(ci("LOG10"), "(", $.value_expression, ")"),

    natural_logarithm: ($) =>
      seq(ci("LN"), "(", $.value_expression, ")"),

    exponential_function: ($) =>
      seq(ci("EXP"), "(", $.value_expression, ")"),

    power_function: ($) =>
      seq(
        ci("POWER"),
        "(",
        $.value_expression,
        ",",
        $.value_expression,
        ")",
      ),

    square_root: ($) =>
      seq(ci("SQRT"), "(", $.value_expression, ")"),

    floor_function: ($) =>
      seq(ci("FLOOR"), "(", $.value_expression, ")"),

    ceiling_function: ($) =>
      seq(
        choice(ci("CEIL"), ci("CEILING")),
        "(",
        $.value_expression,
        ")",
      ),

    // 20.24 String functions
    character_or_byte_string_function: ($) =>
      choice(
        $.sub_character_or_byte_string,
        $.trim_single_character_or_byte_string,
        $.fold_character_string,
        $.trim_multi_character_string,
        $.normalize_character_string,
      ),

    sub_character_or_byte_string: ($) =>
      seq(
        choice(ci("LEFT"), ci("RIGHT")),
        "(",
        $.value_expression,
        ",",
        $.value_expression,
        ")",
      ),

    trim_single_character_or_byte_string: ($) =>
      seq(ci("TRIM"), "(", $.trim_operands, ")"),

    fold_character_string: ($) =>
      seq(
        choice(ci("UPPER"), ci("LOWER")),
        "(",
        $.value_expression,
        ")",
      ),

    trim_multi_character_string: ($) =>
      seq(
        choice(ci("BTRIM"), ci("LTRIM"), ci("RTRIM")),
        "(",
        $.value_expression,
        optional(seq(",", $.value_expression)),
        ")",
      ),

    normalize_character_string: ($) =>
      seq(
        ci("NORMALIZE"),
        "(",
        $.value_expression,
        optional(seq(",", $.normal_form)),
        ")",
      ),

    trim_operands: ($) =>
      seq(
        optional(
          seq(
            optional($.trim_specification),
            optional($.value_expression),
            ci("FROM"),
          ),
        ),
        $.value_expression,
      ),

    trim_specification: (_$) =>
      choice(ci("LEADING"), ci("TRAILING"), ci("BOTH")),

    normal_form: (_$) =>
      choice(ci("NFC"), ci("NFD"), ci("NFKC"), ci("NFKD")),

    // 20.27 Datetime functions
    datetime_subtraction: ($) =>
      seq(
        ci("DURATION_BETWEEN"),
        "(",
        $.value_expression,
        ",",
        $.value_expression,
        ")",
        optional($.temporal_duration_qualifier),
      ),

    datetime_value_function: ($) =>
      choice(
        $.date_function,
        $.time_function,
        $.datetime_function,
        $.local_time_function,
        $.local_datetime_function,
      ),

    date_function: ($) =>
      choice(
        ci("CURRENT_DATE"),
        seq(
          ci("DATE"),
          "(",
          optional(choice($.character_string_literal, $.record_constructor)),
          ")",
        ),
      ),

    time_function: ($) =>
      choice(
        ci("CURRENT_TIME"),
        seq(
          ci("ZONED_TIME"),
          "(",
          optional(choice($.character_string_literal, $.record_constructor)),
          ")",
        ),
      ),

    local_time_function: ($) =>
      choice(
        ci("LOCAL_TIME"),
        seq(
          ci("LOCAL_TIME"),
          "(",
          optional(choice($.character_string_literal, $.record_constructor)),
          ")",
        ),
      ),

    datetime_function: ($) =>
      choice(
        ci("CURRENT_TIMESTAMP"),
        seq(
          ci("ZONED_DATETIME"),
          "(",
          optional(choice($.character_string_literal, $.record_constructor)),
          ")",
        ),
      ),

    local_datetime_function: ($) =>
      choice(
        ci("LOCAL_TIMESTAMP"),
        seq(
          ci("LOCAL_DATETIME"),
          "(",
          optional(choice($.character_string_literal, $.record_constructor)),
          ")",
        ),
      ),

    // 20.29
    duration_value_function: ($) =>
      choice(
        seq(
          ci("DURATION"),
          "(",
          choice($.character_string_literal, $.record_constructor),
          ")",
        ),
        $.absolute_value_expression,
      ),

    // -----------------------------------------------------------------------
    // 21: Names, variables, literals
    // -----------------------------------------------------------------------

    object_name: ($) => $.identifier,

    object_name_or_binding_variable: ($) => $.regular_identifier,

    directory_name: ($) => $.identifier,

    schema_name: ($) => $.identifier,

    graph_name: ($) =>
      choice($.regular_identifier, $.delimited_graph_name),

    delimited_graph_name: ($) =>
      choice(
        $.double_quoted_character_sequence,
        $.accent_quoted_character_sequence,
      ),

    graph_type_name: ($) => $.identifier,

    node_type_name: ($) => $.identifier,

    edge_type_name: ($) => $.identifier,

    binding_table_name: ($) =>
      choice($.regular_identifier, $.delimited_binding_table_name),

    delimited_binding_table_name: ($) =>
      choice(
        $.double_quoted_character_sequence,
        $.accent_quoted_character_sequence,
      ),

    procedure_name: ($) => $.identifier,

    label_name: ($) => $.identifier,

    property_name: ($) => $.identifier,

    field_name: ($) => $.identifier,

    element_variable: ($) => $.binding_variable,

    path_variable: ($) => $.binding_variable,

    subpath_variable: ($) => $.regular_identifier,

    binding_variable: ($) => $.regular_identifier,

    // Identifier
    identifier: ($) =>
      choice(
        $.regular_identifier,
        $.double_quoted_character_sequence,
        $.accent_quoted_character_sequence,
      ),

    regular_identifier: ($) =>
      choice($.regular_identifier_token, $.non_reserved_word),

    implies: (_$) => choice("=>", ci("IMPLIES")),

    // -----------------------------------------------------------------------
    // Literals
    // -----------------------------------------------------------------------

    unsigned_literal: ($) =>
      choice($.unsigned_numeric_literal, $.general_literal),

    general_literal: ($) =>
      choice(
        $.boolean_literal,
        $.character_string_literal,
        $.byte_string_literal,
        $.temporal_literal,
        $.duration_literal,
        $.null_literal,
        $.list_literal,
        $.record_literal,
      ),

    temporal_literal: ($) =>
      choice(
        seq(ci("DATE"), $.character_string_literal),
        seq(ci("TIME"), $.character_string_literal),
        seq(
          choice(ci("DATETIME"), ci("TIMESTAMP")),
          $.character_string_literal,
        ),
      ),

    duration_literal: ($) =>
      seq(ci("DURATION"), $.character_string_literal),

    list_literal: ($) => $.list_value_constructor_by_enumeration,

    record_literal: ($) => $.record_constructor,

    null_literal: (_$) => ci("NULL"),

    boolean_literal: (_$) =>
      choice(ci("TRUE"), ci("FALSE"), ci("UNKNOWN")),

    unsigned_numeric_literal: ($) =>
      choice($.exact_numeric_literal, $.approximate_numeric_literal),

    exact_numeric_literal: ($) =>
      choice(
        $.unsigned_decimal_in_scientific_notation_with_exact_suffix,
        $.unsigned_decimal_in_common_notation_with_exact_suffix,
        $.unsigned_decimal_in_common_notation,
        $.unsigned_decimal_integer_with_exact_suffix,
        $.unsigned_integer,
      ),

    approximate_numeric_literal: ($) =>
      choice(
        $.unsigned_decimal_in_scientific_notation_with_approximate_suffix,
        $.unsigned_decimal_in_scientific_notation,
        $.unsigned_decimal_in_common_notation_with_approximate_suffix,
        $.unsigned_decimal_integer_with_approximate_suffix,
      ),

    unsigned_integer: ($) =>
      choice(
        $.unsigned_decimal_integer,
        $.unsigned_hexadecimal_integer,
        $.unsigned_octal_integer,
        $.unsigned_binary_integer,
      ),

    // -----------------------------------------------------------------------
    // Tokens (lexer rules)
    // -----------------------------------------------------------------------

    regular_identifier_token: (_$) =>
      /[\p{ID_Start}\p{Pc}][\p{ID_Continue}]*/u,

    non_reserved_word: (_$) =>
      choice(
        ci("ACYCLIC"),
        ci("BINDING"),
        ci("BINDINGS"),
        ci("CONNECTING"),
        ci("DESTINATION"),
        ci("DIFFERENT"),
        ci("DIRECTED"),
        ci("EDGE"),
        ci("EDGES"),
        ci("ELEMENT"),
        ci("ELEMENTS"),
        ci("FIRST"),
        ci("GRAPH"),
        ci("GROUPS"),
        ci("KEEP"),
        ci("LABEL"),
        ci("LABELED"),
        ci("LABELS"),
        ci("LAST"),
        ci("NFC"),
        ci("NFD"),
        ci("NFKC"),
        ci("NFKD"),
        ci("NO"),
        ci("NODE"),
        ci("NORMALIZED"),
        ci("ONLY"),
        ci("ORDINALITY"),
        ci("PROPERTY"),
        ci("READ"),
        ci("RELATIONSHIP"),
        ci("RELATIONSHIPS"),
        ci("REPEATABLE"),
        ci("SHORTEST"),
        ci("SIMPLE"),
        ci("SOURCE"),
        ci("TABLE"),
        ci("TO"),
        ci("TRAIL"),
        ci("TRANSACTION"),
        ci("TYPE"),
        ci("UNDIRECTED"),
        ci("VERTEX"),
        ci("WALK"),
        ci("WITHOUT"),
        ci("WRITE"),
        ci("ZONE"),
      ),

    // String literals
    single_quoted_character_sequence: (_$) =>
      token(
        seq(
          optional("@"),
          "'",
          repeat(
            choice(
              /[^'\\\r\n]/,
              "''",
              /\\[\\'"`tbrnf]/,
              /\\u[0-9a-fA-F]{4}/,
              /\\U[0-9a-fA-F]{6}/,
            ),
          ),
          "'",
        ),
      ),

    double_quoted_character_sequence: (_$) =>
      token(
        seq(
          optional("@"),
          '"',
          repeat(
            choice(
              /[^"\\\r\n]/,
              '""',
              /\\[\\'"`tbrnf]/,
              /\\u[0-9a-fA-F]{4}/,
              /\\U[0-9a-fA-F]{6}/,
            ),
          ),
          '"',
        ),
      ),

    accent_quoted_character_sequence: (_$) =>
      token(
        seq(
          optional("@"),
          "`",
          repeat(
            choice(
              /[^`\\\r\n]/,
              "``",
              /\\[\\'"`tbrnf]/,
              /\\u[0-9a-fA-F]{4}/,
              /\\U[0-9a-fA-F]{6}/,
            ),
          ),
          "`",
        ),
      ),

    character_string_literal: ($) =>
      choice(
        $.single_quoted_character_sequence,
        $.double_quoted_character_sequence,
      ),

    byte_string_literal: (_$) =>
      token(seq(/[Xx]/, "'", repeat(choice(/[0-9a-fA-F]/, /\s/)), "'")),

    // Numeric tokens
    unsigned_decimal_integer: (_$) => /[0-9](_?[0-9])*/,

    unsigned_hexadecimal_integer: (_$) => /0[xX](_?[0-9a-fA-F])+/,

    unsigned_octal_integer: (_$) => /0[oO](_?[0-7])+/,

    unsigned_binary_integer: (_$) => /0[bB](_?[01])+/,

    unsigned_decimal_in_common_notation: (_$) =>
      token(
        choice(
          seq(/[0-9](_?[0-9])*/, ".", optional(/[0-9](_?[0-9])*/)),
          seq(".", /[0-9](_?[0-9])*/),
        ),
      ),

    unsigned_decimal_in_scientific_notation: (_$) =>
      token(
        seq(
          choice(
            seq(/[0-9](_?[0-9])*/, ".", optional(/[0-9](_?[0-9])*/)),
            seq(".", /[0-9](_?[0-9])*/),
            /[0-9](_?[0-9])*/,
          ),
          /[eE]/,
          optional(/[+-]/),
          /[0-9](_?[0-9])*/,
        ),
      ),

    unsigned_decimal_in_scientific_notation_with_exact_suffix: (_$) =>
      token(
        seq(
          choice(
            seq(/[0-9](_?[0-9])*/, ".", optional(/[0-9](_?[0-9])*/)),
            seq(".", /[0-9](_?[0-9])*/),
            /[0-9](_?[0-9])*/,
          ),
          /[eE]/,
          optional(/[+-]/),
          /[0-9](_?[0-9])*/,
          /[mM]/,
        ),
      ),

    unsigned_decimal_in_scientific_notation_with_approximate_suffix: (_$) =>
      token(
        seq(
          choice(
            seq(/[0-9](_?[0-9])*/, ".", optional(/[0-9](_?[0-9])*/)),
            seq(".", /[0-9](_?[0-9])*/),
            /[0-9](_?[0-9])*/,
          ),
          /[eE]/,
          optional(/[+-]/),
          /[0-9](_?[0-9])*/,
          /[fFdD]/,
        ),
      ),

    unsigned_decimal_in_common_notation_with_exact_suffix: (_$) =>
      token(
        seq(
          choice(
            seq(/[0-9](_?[0-9])*/, ".", optional(/[0-9](_?[0-9])*/)),
            seq(".", /[0-9](_?[0-9])*/),
          ),
          /[mM]/,
        ),
      ),

    unsigned_decimal_in_common_notation_with_approximate_suffix: (_$) =>
      token(
        seq(
          choice(
            seq(/[0-9](_?[0-9])*/, ".", optional(/[0-9](_?[0-9])*/)),
            seq(".", /[0-9](_?[0-9])*/),
          ),
          /[fFdD]/,
        ),
      ),

    unsigned_decimal_integer_with_exact_suffix: (_$) =>
      token(seq(/[0-9](_?[0-9])*/, /[mM]/)),

    unsigned_decimal_integer_with_approximate_suffix: (_$) =>
      token(seq(/[0-9](_?[0-9])*/, /[fFdD]/)),

    // Parameter references
    substituted_parameter_reference: (_$) =>
      token(seq("$$", /[\p{ID_Start}\p{Pc}][\p{ID_Continue}]*/u)),

    general_parameter_reference: (_$) =>
      token(seq("$", /[\p{ID_Start}\p{Pc}][\p{ID_Continue}]*/u)),

    // Synonyms
    node_synonym: (_$) => choice(ci("NODE"), ci("VERTEX")),

    edges_synonym: (_$) => choice(ci("EDGES"), ci("RELATIONSHIPS")),

    edge_synonym: (_$) => choice(ci("EDGE"), ci("RELATIONSHIP")),

    // Comments
    block_comment: (_$) => token(seq("/*", /(\*[^/]|[^*])*/, "*/")),

    line_comment_solidus: (_$) => token(seq("//", /[^\r\n]*/)),

    line_comment_minus: (_$) => token(seq("--", /[^\r\n]*/)),
  },
});
