// Type-checks every shared SSR parity vector payload against SuggestionResponse
// (satisfies = SDK requirements met; NoExtra = every server key is known to the SDK type).
// Drift fails `npm run typecheck:tests`. Vector payloads are typed `unknown`-free JSON.
import type { SuggestionResponse } from "../../src/index.js";
import type { Assert, NoExtra, Widen } from "./type-helpers.js";
import real_fundsageai from "../fixtures/payloads/real_fundsageai.json";
import brokenlink_legacy_replacement_url_worker_noop from "../fixtures/ssr-parity-vectors/brokenlink_legacy_replacement_url_worker_noop.json";
import brokenlink_replace_new_url_edge from "../fixtures/ssr-parity-vectors/brokenlink_replace_new_url_edge.json";
import brokenlink_unlink_whole_anchor from "../fixtures/ssr-parity-vectors/brokenlink_unlink_whole_anchor.json";
import diff_apply_ignores_script_duplicate from "../fixtures/ssr-parity-vectors/diff_apply_ignores_script_duplicate.json";
import diff_apply_unique_single_root from "../fixtures/ssr-parity-vectors/diff_apply_unique_single_root.json";
import diff_batch_order_dependent_diffs_apply_in_payload_order from "../fixtures/ssr-parity-vectors/diff_batch_order_dependent_diffs_apply_in_payload_order.json";
import diff_delete_operation_skipped_in_worker from "../fixtures/ssr-parity-vectors/diff_delete_operation_skipped_in_worker.json";
import diff_idempotent_already_applied from "../fixtures/ssr-parity-vectors/diff_idempotent_already_applied.json";
import diff_insert_after_operation_replaces_in_worker from "../fixtures/ssr-parity-vectors/diff_insert_after_operation_replaces_in_worker.json";
import diff_reverse_order_second_diff_finds_nothing from "../fixtures/ssr-parity-vectors/diff_reverse_order_second_diff_finds_nothing.json";
import diff_skip_ambiguous from "../fixtures/ssr-parity-vectors/diff_skip_ambiguous.json";
import diff_skip_drifted from "../fixtures/ssr-parity-vectors/diff_skip_drifted.json";
import failopen_empty_payload_ssr_flag_only from "../fixtures/ssr-parity-vectors/failopen_empty_payload_ssr_flag_only.json";
import failopen_errors_payload_with_other_fields_set from "../fixtures/ssr-parity-vectors/failopen_errors_payload_with_other_fields_set.json";
import failopen_excluded_page_error_payload from "../fixtures/ssr-parity-vectors/failopen_excluded_page_error_payload.json";
import failopen_no_body_tag from "../fixtures/ssr-parity-vectors/failopen_no_body_tag.json";
import failopen_page_missing_error_payload from "../fixtures/ssr-parity-vectors/failopen_page_missing_error_payload.json";
import h1_replacement_escapes_html from "../fixtures/ssr-parity-vectors/h1_replacement_escapes_html.json";
import h1_without_h1_in_page_is_noop from "../fixtures/ssr-parity-vectors/h1_without_h1_in_page_is_noop.json";
import images_fill_short_alt from "../fixtures/ssr-parity-vectors/images_fill_short_alt.json";
import images_keep_good_alt from "../fixtures/ssr-parity-vectors/images_keep_good_alt.json";
import images_lazy_placeholder_data_src from "../fixtures/ssr-parity-vectors/images_lazy_placeholder_data_src.json";
import images_next_optimizer_distinct_alts from "../fixtures/ssr-parity-vectors/images_next_optimizer_distinct_alts.json";
import images_percent_encoded_path from "../fixtures/ssr-parity-vectors/images_percent_encoded_path.json";
import images_relative_src_real_payload from "../fixtures/ssr-parity-vectors/images_relative_src_real_payload.json";
import images_relative_srcset from "../fixtures/ssr-parity-vectors/images_relative_srcset.json";
import link_custom_class from "../fixtures/ssr-parity-vectors/link_custom_class.json";
import link_dedupe_keyword_listed_twice from "../fixtures/ssr-parity-vectors/link_dedupe_keyword_listed_twice.json";
import link_first_occurrence_only from "../fixtures/ssr-parity-vectors/link_first_occurrence_only.json";
import link_isasian_chinese from "../fixtures/ssr-parity-vectors/link_isasian_chinese.json";
import link_isasian_japanese from "../fixtures/ssr-parity-vectors/link_isasian_japanese.json";
import link_isasian_japanese_sentence_final from "../fixtures/ssr-parity-vectors/link_isasian_japanese_sentence_final.json";
import link_keyword_case_differs_from_page_text from "../fixtures/ssr-parity-vectors/link_keyword_case_differs_from_page_text.json";
import link_skip_inside_anchor_and_heading from "../fixtures/ssr-parity-vectors/link_skip_inside_anchor_and_heading.json";
import manifest_comment_combined_mutations from "../fixtures/ssr-parity-vectors/manifest_comment_combined_mutations.json";
import meta_keywords_skipped_when_present from "../fixtures/ssr-parity-vectors/meta_keywords_skipped_when_present.json";
import meta_tags_added_when_absent from "../fixtures/ssr-parity-vectors/meta_tags_added_when_absent.json";
import meta_tags_skipped_when_present from "../fixtures/ssr-parity-vectors/meta_tags_skipped_when_present.json";
import real_fundsageai_links_and_og from "../fixtures/ssr-parity-vectors/real_fundsageai_links_and_og.json";
import schema_dedupe_broader_type_does_not_cover_faq from "../fixtures/ssr-parity-vectors/schema_dedupe_broader_type_does_not_cover_faq.json";
import schema_dedupe_exact_type_present from "../fixtures/ssr-parity-vectors/schema_dedupe_exact_type_present.json";
import schema_dedupe_ignores_unparsable_existing_block from "../fixtures/ssr-parity-vectors/schema_dedupe_ignores_unparsable_existing_block.json";
import schema_dedupe_multi_type_node_needs_all_types from "../fixtures/ssr-parity-vectors/schema_dedupe_multi_type_node_needs_all_types.json";
import schema_dedupe_subtype_present from "../fixtures/ssr-parity-vectors/schema_dedupe_subtype_present.json";
import schema_dedupe_top_level_array_in_existing_block from "../fixtures/ssr-parity-vectors/schema_dedupe_top_level_array_in_existing_block.json";
import schema_dedupe_type_inside_existing_graph from "../fixtures/ssr-parity-vectors/schema_dedupe_type_inside_existing_graph.json";
import schema_dedupe_untyped_node_always_injected from "../fixtures/ssr-parity-vectors/schema_dedupe_untyped_node_always_injected.json";
import schema_graph_payload_unwrapped from "../fixtures/ssr-parity-vectors/schema_graph_payload_unwrapped.json";
import schema_own_block_removed_when_site_covers_type from "../fixtures/ssr-parity-vectors/schema_own_block_removed_when_site_covers_type.json";
import schema_replace_own_block from "../fixtures/ssr-parity-vectors/schema_replace_own_block.json";
import server_accessibility_elements_not_applied_by_worker from "../fixtures/ssr-parity-vectors/server_accessibility_elements_not_applied_by_worker.json";
import server_alt_text_images from "../fixtures/ssr-parity-vectors/server_alt_text_images.json";
import server_broken_links from "../fixtures/ssr-parity-vectors/server_broken_links.json";
import server_content_patches_all_operations from "../fixtures/ssr-parity-vectors/server_content_patches_all_operations.json";
import server_everything_combined from "../fixtures/ssr-parity-vectors/server_everything_combined.json";
import server_internal_links from "../fixtures/ssr-parity-vectors/server_internal_links.json";
import server_meta_tags_h1_keywords from "../fixtures/ssr-parity-vectors/server_meta_tags_h1_keywords.json";
import server_schema_array from "../fixtures/ssr-parity-vectors/server_schema_array.json";
import server_schema_local_business from "../fixtures/ssr-parity-vectors/server_schema_local_business.json";
import server_schema_single_object from "../fixtures/ssr-parity-vectors/server_schema_single_object.json";
import structured_data_double_decode from "../fixtures/ssr-parity-vectors/structured_data_double_decode.json";
import structured_data_single_decode from "../fixtures/ssr-parity-vectors/structured_data_single_decode.json";
import structured_data_unicode from "../fixtures/ssr-parity-vectors/structured_data_unicode.json";

export const typed = {
  real_fundsageai: real_fundsageai satisfies SuggestionResponse,
  brokenlink_legacy_replacement_url_worker_noop: brokenlink_legacy_replacement_url_worker_noop.payload satisfies Widen<SuggestionResponse>,
  brokenlink_replace_new_url_edge: brokenlink_replace_new_url_edge.payload satisfies Widen<SuggestionResponse>,
  brokenlink_unlink_whole_anchor: brokenlink_unlink_whole_anchor.payload satisfies Widen<SuggestionResponse>,
  diff_apply_ignores_script_duplicate: diff_apply_ignores_script_duplicate.payload satisfies Widen<SuggestionResponse>,
  diff_apply_unique_single_root: diff_apply_unique_single_root.payload satisfies Widen<SuggestionResponse>,
  diff_batch_order_dependent_diffs_apply_in_payload_order: diff_batch_order_dependent_diffs_apply_in_payload_order.payload satisfies Widen<SuggestionResponse>,
  diff_delete_operation_skipped_in_worker: diff_delete_operation_skipped_in_worker.payload satisfies Widen<SuggestionResponse>,
  diff_idempotent_already_applied: diff_idempotent_already_applied.payload satisfies Widen<SuggestionResponse>,
  diff_insert_after_operation_replaces_in_worker: diff_insert_after_operation_replaces_in_worker.payload satisfies Widen<SuggestionResponse>,
  diff_reverse_order_second_diff_finds_nothing: diff_reverse_order_second_diff_finds_nothing.payload satisfies Widen<SuggestionResponse>,
  diff_skip_ambiguous: diff_skip_ambiguous.payload satisfies Widen<SuggestionResponse>,
  diff_skip_drifted: diff_skip_drifted.payload satisfies Widen<SuggestionResponse>,
  failopen_empty_payload_ssr_flag_only: failopen_empty_payload_ssr_flag_only.payload satisfies Widen<SuggestionResponse>,
  failopen_errors_payload_with_other_fields_set: failopen_errors_payload_with_other_fields_set.payload satisfies Widen<SuggestionResponse>,
  failopen_excluded_page_error_payload: failopen_excluded_page_error_payload.payload satisfies Widen<SuggestionResponse>,
  failopen_no_body_tag: failopen_no_body_tag.payload satisfies Widen<SuggestionResponse>,
  failopen_page_missing_error_payload: failopen_page_missing_error_payload.payload satisfies Widen<SuggestionResponse>,
  h1_replacement_escapes_html: h1_replacement_escapes_html.payload satisfies Widen<SuggestionResponse>,
  h1_without_h1_in_page_is_noop: h1_without_h1_in_page_is_noop.payload satisfies Widen<SuggestionResponse>,
  images_fill_short_alt: images_fill_short_alt.payload satisfies Widen<SuggestionResponse>,
  images_keep_good_alt: images_keep_good_alt.payload satisfies Widen<SuggestionResponse>,
  images_lazy_placeholder_data_src: images_lazy_placeholder_data_src.payload satisfies Widen<SuggestionResponse>,
  images_next_optimizer_distinct_alts: images_next_optimizer_distinct_alts.payload satisfies Widen<SuggestionResponse>,
  images_percent_encoded_path: images_percent_encoded_path.payload satisfies Widen<SuggestionResponse>,
  images_relative_src_real_payload: images_relative_src_real_payload.payload satisfies Widen<SuggestionResponse>,
  images_relative_srcset: images_relative_srcset.payload satisfies Widen<SuggestionResponse>,
  link_custom_class: link_custom_class.payload satisfies Widen<SuggestionResponse>,
  link_dedupe_keyword_listed_twice: link_dedupe_keyword_listed_twice.payload satisfies Widen<SuggestionResponse>,
  link_first_occurrence_only: link_first_occurrence_only.payload satisfies Widen<SuggestionResponse>,
  link_isasian_chinese: link_isasian_chinese.payload satisfies Widen<SuggestionResponse>,
  link_isasian_japanese: link_isasian_japanese.payload satisfies Widen<SuggestionResponse>,
  link_isasian_japanese_sentence_final: link_isasian_japanese_sentence_final.payload satisfies Widen<SuggestionResponse>,
  link_keyword_case_differs_from_page_text: link_keyword_case_differs_from_page_text.payload satisfies Widen<SuggestionResponse>,
  link_skip_inside_anchor_and_heading: link_skip_inside_anchor_and_heading.payload satisfies Widen<SuggestionResponse>,
  manifest_comment_combined_mutations: manifest_comment_combined_mutations.payload satisfies Widen<SuggestionResponse>,
  meta_keywords_skipped_when_present: meta_keywords_skipped_when_present.payload satisfies Widen<SuggestionResponse>,
  meta_tags_added_when_absent: meta_tags_added_when_absent.payload satisfies Widen<SuggestionResponse>,
  meta_tags_skipped_when_present: meta_tags_skipped_when_present.payload satisfies Widen<SuggestionResponse>,
  real_fundsageai_links_and_og: real_fundsageai_links_and_og.payload satisfies Widen<SuggestionResponse>,
  schema_dedupe_broader_type_does_not_cover_faq: schema_dedupe_broader_type_does_not_cover_faq.payload satisfies Widen<SuggestionResponse>,
  schema_dedupe_exact_type_present: schema_dedupe_exact_type_present.payload satisfies Widen<SuggestionResponse>,
  schema_dedupe_ignores_unparsable_existing_block: schema_dedupe_ignores_unparsable_existing_block.payload satisfies Widen<SuggestionResponse>,
  schema_dedupe_multi_type_node_needs_all_types: schema_dedupe_multi_type_node_needs_all_types.payload satisfies Widen<SuggestionResponse>,
  schema_dedupe_subtype_present: schema_dedupe_subtype_present.payload satisfies Widen<SuggestionResponse>,
  schema_dedupe_top_level_array_in_existing_block: schema_dedupe_top_level_array_in_existing_block.payload satisfies Widen<SuggestionResponse>,
  schema_dedupe_type_inside_existing_graph: schema_dedupe_type_inside_existing_graph.payload satisfies Widen<SuggestionResponse>,
  schema_dedupe_untyped_node_always_injected: schema_dedupe_untyped_node_always_injected.payload satisfies Widen<SuggestionResponse>,
  schema_graph_payload_unwrapped: schema_graph_payload_unwrapped.payload satisfies Widen<SuggestionResponse>,
  schema_own_block_removed_when_site_covers_type: schema_own_block_removed_when_site_covers_type.payload satisfies Widen<SuggestionResponse>,
  schema_replace_own_block: schema_replace_own_block.payload satisfies Widen<SuggestionResponse>,
  server_accessibility_elements_not_applied_by_worker: server_accessibility_elements_not_applied_by_worker.payload satisfies Widen<SuggestionResponse>,
  server_alt_text_images: server_alt_text_images.payload satisfies Widen<SuggestionResponse>,
  server_broken_links: server_broken_links.payload satisfies Widen<SuggestionResponse>,
  server_content_patches_all_operations: server_content_patches_all_operations.payload satisfies Widen<SuggestionResponse>,
  server_everything_combined: server_everything_combined.payload satisfies Widen<SuggestionResponse>,
  server_internal_links: server_internal_links.payload satisfies Widen<SuggestionResponse>,
  server_meta_tags_h1_keywords: server_meta_tags_h1_keywords.payload satisfies Widen<SuggestionResponse>,
  server_schema_array: server_schema_array.payload satisfies Widen<SuggestionResponse>,
  server_schema_local_business: server_schema_local_business.payload satisfies Widen<SuggestionResponse>,
  server_schema_single_object: server_schema_single_object.payload satisfies Widen<SuggestionResponse>,
  structured_data_double_decode: structured_data_double_decode.payload satisfies Widen<SuggestionResponse>,
  structured_data_single_decode: structured_data_single_decode.payload satisfies Widen<SuggestionResponse>,
  structured_data_unicode: structured_data_unicode.payload satisfies Widen<SuggestionResponse>,
};

export type NoExtra_brokenlink_legacy_replacement_url_worker_noop = Assert<NoExtra<typeof brokenlink_legacy_replacement_url_worker_noop.payload, SuggestionResponse>>;
export type NoExtra_brokenlink_replace_new_url_edge = Assert<NoExtra<typeof brokenlink_replace_new_url_edge.payload, SuggestionResponse>>;
export type NoExtra_brokenlink_unlink_whole_anchor = Assert<NoExtra<typeof brokenlink_unlink_whole_anchor.payload, SuggestionResponse>>;
export type NoExtra_diff_apply_ignores_script_duplicate = Assert<NoExtra<typeof diff_apply_ignores_script_duplicate.payload, SuggestionResponse>>;
export type NoExtra_diff_apply_unique_single_root = Assert<NoExtra<typeof diff_apply_unique_single_root.payload, SuggestionResponse>>;
export type NoExtra_diff_batch_order_dependent_diffs_apply_in_payload_order = Assert<NoExtra<typeof diff_batch_order_dependent_diffs_apply_in_payload_order.payload, SuggestionResponse>>;
export type NoExtra_diff_delete_operation_skipped_in_worker = Assert<NoExtra<typeof diff_delete_operation_skipped_in_worker.payload, SuggestionResponse>>;
export type NoExtra_diff_idempotent_already_applied = Assert<NoExtra<typeof diff_idempotent_already_applied.payload, SuggestionResponse>>;
export type NoExtra_diff_insert_after_operation_replaces_in_worker = Assert<NoExtra<typeof diff_insert_after_operation_replaces_in_worker.payload, SuggestionResponse>>;
export type NoExtra_diff_reverse_order_second_diff_finds_nothing = Assert<NoExtra<typeof diff_reverse_order_second_diff_finds_nothing.payload, SuggestionResponse>>;
export type NoExtra_diff_skip_ambiguous = Assert<NoExtra<typeof diff_skip_ambiguous.payload, SuggestionResponse>>;
export type NoExtra_diff_skip_drifted = Assert<NoExtra<typeof diff_skip_drifted.payload, SuggestionResponse>>;
export type NoExtra_failopen_empty_payload_ssr_flag_only = Assert<NoExtra<typeof failopen_empty_payload_ssr_flag_only.payload, SuggestionResponse>>;
export type NoExtra_failopen_errors_payload_with_other_fields_set = Assert<NoExtra<typeof failopen_errors_payload_with_other_fields_set.payload, SuggestionResponse>>;
export type NoExtra_failopen_excluded_page_error_payload = Assert<NoExtra<typeof failopen_excluded_page_error_payload.payload, SuggestionResponse>>;
export type NoExtra_failopen_no_body_tag = Assert<NoExtra<typeof failopen_no_body_tag.payload, SuggestionResponse>>;
export type NoExtra_failopen_page_missing_error_payload = Assert<NoExtra<typeof failopen_page_missing_error_payload.payload, SuggestionResponse>>;
export type NoExtra_h1_replacement_escapes_html = Assert<NoExtra<typeof h1_replacement_escapes_html.payload, SuggestionResponse>>;
export type NoExtra_h1_without_h1_in_page_is_noop = Assert<NoExtra<typeof h1_without_h1_in_page_is_noop.payload, SuggestionResponse>>;
export type NoExtra_images_fill_short_alt = Assert<NoExtra<typeof images_fill_short_alt.payload, SuggestionResponse>>;
export type NoExtra_images_keep_good_alt = Assert<NoExtra<typeof images_keep_good_alt.payload, SuggestionResponse>>;
export type NoExtra_images_lazy_placeholder_data_src = Assert<NoExtra<typeof images_lazy_placeholder_data_src.payload, SuggestionResponse>>;
export type NoExtra_images_next_optimizer_distinct_alts = Assert<NoExtra<typeof images_next_optimizer_distinct_alts.payload, SuggestionResponse>>;
export type NoExtra_images_percent_encoded_path = Assert<NoExtra<typeof images_percent_encoded_path.payload, SuggestionResponse>>;
export type NoExtra_images_relative_src_real_payload = Assert<NoExtra<typeof images_relative_src_real_payload.payload, SuggestionResponse>>;
export type NoExtra_images_relative_srcset = Assert<NoExtra<typeof images_relative_srcset.payload, SuggestionResponse>>;
export type NoExtra_link_custom_class = Assert<NoExtra<typeof link_custom_class.payload, SuggestionResponse>>;
export type NoExtra_link_dedupe_keyword_listed_twice = Assert<NoExtra<typeof link_dedupe_keyword_listed_twice.payload, SuggestionResponse>>;
export type NoExtra_link_first_occurrence_only = Assert<NoExtra<typeof link_first_occurrence_only.payload, SuggestionResponse>>;
export type NoExtra_link_isasian_chinese = Assert<NoExtra<typeof link_isasian_chinese.payload, SuggestionResponse>>;
export type NoExtra_link_isasian_japanese = Assert<NoExtra<typeof link_isasian_japanese.payload, SuggestionResponse>>;
export type NoExtra_link_isasian_japanese_sentence_final = Assert<NoExtra<typeof link_isasian_japanese_sentence_final.payload, SuggestionResponse>>;
export type NoExtra_link_keyword_case_differs_from_page_text = Assert<NoExtra<typeof link_keyword_case_differs_from_page_text.payload, SuggestionResponse>>;
export type NoExtra_link_skip_inside_anchor_and_heading = Assert<NoExtra<typeof link_skip_inside_anchor_and_heading.payload, SuggestionResponse>>;
export type NoExtra_manifest_comment_combined_mutations = Assert<NoExtra<typeof manifest_comment_combined_mutations.payload, SuggestionResponse>>;
export type NoExtra_meta_keywords_skipped_when_present = Assert<NoExtra<typeof meta_keywords_skipped_when_present.payload, SuggestionResponse>>;
export type NoExtra_meta_tags_added_when_absent = Assert<NoExtra<typeof meta_tags_added_when_absent.payload, SuggestionResponse>>;
export type NoExtra_meta_tags_skipped_when_present = Assert<NoExtra<typeof meta_tags_skipped_when_present.payload, SuggestionResponse>>;
export type NoExtra_real_fundsageai_links_and_og = Assert<NoExtra<typeof real_fundsageai_links_and_og.payload, SuggestionResponse>>;
export type NoExtra_schema_dedupe_broader_type_does_not_cover_faq = Assert<NoExtra<typeof schema_dedupe_broader_type_does_not_cover_faq.payload, SuggestionResponse>>;
export type NoExtra_schema_dedupe_exact_type_present = Assert<NoExtra<typeof schema_dedupe_exact_type_present.payload, SuggestionResponse>>;
export type NoExtra_schema_dedupe_ignores_unparsable_existing_block = Assert<NoExtra<typeof schema_dedupe_ignores_unparsable_existing_block.payload, SuggestionResponse>>;
export type NoExtra_schema_dedupe_multi_type_node_needs_all_types = Assert<NoExtra<typeof schema_dedupe_multi_type_node_needs_all_types.payload, SuggestionResponse>>;
export type NoExtra_schema_dedupe_subtype_present = Assert<NoExtra<typeof schema_dedupe_subtype_present.payload, SuggestionResponse>>;
export type NoExtra_schema_dedupe_top_level_array_in_existing_block = Assert<NoExtra<typeof schema_dedupe_top_level_array_in_existing_block.payload, SuggestionResponse>>;
export type NoExtra_schema_dedupe_type_inside_existing_graph = Assert<NoExtra<typeof schema_dedupe_type_inside_existing_graph.payload, SuggestionResponse>>;
export type NoExtra_schema_dedupe_untyped_node_always_injected = Assert<NoExtra<typeof schema_dedupe_untyped_node_always_injected.payload, SuggestionResponse>>;
export type NoExtra_schema_graph_payload_unwrapped = Assert<NoExtra<typeof schema_graph_payload_unwrapped.payload, SuggestionResponse>>;
export type NoExtra_schema_own_block_removed_when_site_covers_type = Assert<NoExtra<typeof schema_own_block_removed_when_site_covers_type.payload, SuggestionResponse>>;
export type NoExtra_schema_replace_own_block = Assert<NoExtra<typeof schema_replace_own_block.payload, SuggestionResponse>>;
export type NoExtra_server_accessibility_elements_not_applied_by_worker = Assert<NoExtra<typeof server_accessibility_elements_not_applied_by_worker.payload, SuggestionResponse>>;
export type NoExtra_server_alt_text_images = Assert<NoExtra<typeof server_alt_text_images.payload, SuggestionResponse>>;
export type NoExtra_server_broken_links = Assert<NoExtra<typeof server_broken_links.payload, SuggestionResponse>>;
export type NoExtra_server_content_patches_all_operations = Assert<NoExtra<typeof server_content_patches_all_operations.payload, SuggestionResponse>>;
export type NoExtra_server_everything_combined = Assert<NoExtra<typeof server_everything_combined.payload, SuggestionResponse>>;
export type NoExtra_server_internal_links = Assert<NoExtra<typeof server_internal_links.payload, SuggestionResponse>>;
export type NoExtra_server_meta_tags_h1_keywords = Assert<NoExtra<typeof server_meta_tags_h1_keywords.payload, SuggestionResponse>>;
export type NoExtra_server_schema_array = Assert<NoExtra<typeof server_schema_array.payload, SuggestionResponse>>;
export type NoExtra_server_schema_local_business = Assert<NoExtra<typeof server_schema_local_business.payload, SuggestionResponse>>;
export type NoExtra_server_schema_single_object = Assert<NoExtra<typeof server_schema_single_object.payload, SuggestionResponse>>;
export type NoExtra_structured_data_double_decode = Assert<NoExtra<typeof structured_data_double_decode.payload, SuggestionResponse>>;
export type NoExtra_structured_data_single_decode = Assert<NoExtra<typeof structured_data_single_decode.payload, SuggestionResponse>>;
export type NoExtra_structured_data_unicode = Assert<NoExtra<typeof structured_data_unicode.payload, SuggestionResponse>>;
