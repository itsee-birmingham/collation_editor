/*global window, document, MAG, CL, OR, RG, REDIPS, SimpleContextMenu */
/*jslint nomen: true*/

var SV = (function () {
	"use strict";
	return {
		hello: function () {
			console.log('set-variants');
		},

		/** Major operations in this file (by which I mean ones directly called by the user interface) are:
		 * combine_units (calling do_combine_units)
		 * split_unit
		 * move_reading
		 * move_unit (calling do_move_whole_unit and do_move_single-reading)
		 *  */

		_show_shared_units: false,
		_selected_variant_units: [],
		_watch_list: [],
		_message_pos_left: null,
		_message_expanded: true,
		_undo_stack: [],
		_undo_stack_length: 6,




		/**create and show the set variants display
		 * 
		 * optional:
		 * options - a dict containing other options
		 * 		 possibilities are:
		 * 			container - the HTML element to put the html result in 
		 *              		(defaults to body if not supplied or can't find it)
		 * 			message - a string containing a message to display in the header bar 
		 *              		(used for warnings and errors) 
		 *              	highlighted_wit - the witness to highlight in display
		 *              	highlighted_unit - the unit which needs to be highlighted as an error*/
		show_set_variants: function (options) {
			var html, i, unit_button, temp, header, event_rows, num, key, overlaps, app_ids,
			error_panel_html, row, hands, result, undo_button, footer_html, overlap_options, new_overlap_options;
			console.log(CL._data);
			if (typeof options === 'undefined') {
				options = {};
			}
			//make sure we have a container to put things in
			if (options.hasOwnProperty('container')) {                
				if (container !== options.container) container = options.container;
			} else {
				container = document.getElementsByTagName('body')[0];
			}

			//attach right click menus
			SimpleContextMenu.setup({'preventDefault' : true, 'preventForms' : false});
			SimpleContextMenu.attach('unit', function () {return SV.make_menu('unit')});
			SimpleContextMenu.attach('overlap_unit', function () {return SV.make_menu('overlap_unit')});
			SimpleContextMenu.attach('split_unit_a', function () {return SV.make_menu('split_unit_a')});
			SimpleContextMenu.attach('split_unit', function () {return SV.make_menu('split_unit')});
			SimpleContextMenu.attach('overlap_split_unit_a', function () {return SV.make_menu('overlap_split_unit_a')});
			SimpleContextMenu.attach('overlap_split_unit', function () {return SV.make_menu('overlap_split_unit')});
			SimpleContextMenu.attach('split_omlac_unit', function () {return SV.make_menu('split_omlac_unit')});
			SimpleContextMenu.attach('split_duplicate_unit', function () {return SV.make_menu('split_duplicate_unit')});
			SimpleContextMenu.attach('subreading', function () {return SV.make_menu('subreading')});		
			
			//sort out header and main page
			
			document.getElementById('header').innerHTML = CL.get_header_html('Set Variants', CL._context);
			document.getElementById('header').className = 'set_variants_header';
			CL._services.show_login_status();
			
			SV._add_CM_Handlers(); 
			
			//sort out footer stuff
			CL.expandFillPageClients();
//			if (SV._undo_stack.length > 0) {
//				undo_button = '<input type="button" id="undo_button" value="undo"/>';
//			} else {
//				undo_button = '';
//			}
			footer_html = [];
			footer_html.push('<input id="expand_collapse_button" type="button" value="expand all"/>');  
			footer_html.push('<input id="show_hide_subreadings_button" type=button value="show subreadings"/>');
			footer_html.push('<span id="stage_links"></span>');
			footer_html.push('<input type="button" id="undo_button" value="undo" style="display:none"/>');
			footer_html.push('<select id="highlighted" name="highlighted"></select>');
			footer_html.push('<input id="show_hide_shared_units" type=button value="Show Shared Units"/>');
			footer_html.push('<input id="save" type=button value="Save"/>');
			footer_html.push('<input id="move_to_reorder_button" type=button value="Move to Reorder Variants"/>');
			document.getElementById('footer').innerHTML = footer_html.join('');
			CL.add_stage_links();
			
			//get the data itself
			container.innerHTML = '<div id="drag"><div id="scroller" class="fillPage"></div><div id="single_witness_reading"></div></div>';
			document.getElementById('single_witness_reading').style.bottom = document.getElementById('footer').offsetHeight + 'px';
			SV.show_set_variants_data(options);
			
			//add functions and populate dropdowns etc.
			CL.add_subreading_events('set_variants');
			
			U.FORMS.populate_select(SV.get_hands_and_sigla(), document.getElementById('highlighted'), 'document', 'hand', options.highlighted_wit);
			
			if (document.getElementById('show_hide_shared_units')) {
				$('#show_hide_shared_units').on('click', function (event) {
					if (SV._show_shared_units === true) {
						SPN.show_loading_overlay();
						SV._show_shared_units = false;
						document.getElementById('show_hide_shared_units').value = document.getElementById('show_hide_shared_units').value.replace('Hide', 'Show');
						SV.show_set_variants_data();
					} else {
						SPN.show_loading_overlay();
						SV._show_shared_units = true;
						document.getElementById('show_hide_shared_units').value = document.getElementById('show_hide_shared_units').value.replace('Show', 'Hide');
						SV.show_set_variants_data();
					}
				});
			}	
			
			$('#move_to_reorder_button').on('click', function (event) {SV.move_to_reorder();});
			
			$('#save').on('click', function (event) {
				SV.check_bug_status('saved', 'state');
				SR._lose_subreadings();
				CL.save_collation('set');
			});
			
			$('#highlighted').on('change', function (event) {SV.highlight_witness(event.target.value);});
			if (document.getElementById('undo_button')) {
				$('#undo_button').on('click', function (event) {
					SPN.show_loading_overlay();
					SV.undo();
				});
			}

			CL.make_verse_links();
		},
		
		show_set_variants_data: function (options) {
			var temp, header, html, i, app_ids, num, overlaps, overlap_options, new_overlap_options, error_panel_html, event_rows, row;
			//sort out options and get layout
			if (typeof options === 'undefined') {
				options = {};
			}
			if (!options.hasOwnProperty('highlighted_wit') && CL._highlighted !== 'none') {
				options.highlighted_wit = CL._highlighted;
			}
			options.sort = true;
			
			SV.prepare_for_operation();
			CL.lac_om_fix(); //also does extra gaps
			SV.unprepare_for_operation();
			
			temp = CL.get_unit_layout(CL._data.apparatus, 1, 'set_variants', options);
			header = CL.get_collation_header(CL._data, temp[1], true);
			html = header[0];
			html.push.apply(html, temp[0]);
			
			overlap_options = {'column_lengths': temp[1]};			
			if (options.hasOwnProperty('highlighted_wit')) {
				overlap_options.highlighted_wit = options.highlighted_wit;
			}
			if (options.hasOwnProperty('highlighted_unit')) {
				overlap_options.highlighted_unit = options.highlighted_unit;
			}
			app_ids = CL.get_ordered_app_lines();
			for (i = 0; i < app_ids.length; i += 1) {
				num = app_ids[i].replace('apparatus', '');
				new_overlap_options = SV.calculate_unit_lengths(app_ids[i], overlap_options);
				overlaps = CL.get_overlap_layout(CL._data[app_ids[i]], num, 'set_variants', header[1], new_overlap_options);
				html.push.apply(html, overlaps[0]);
				temp[2].push.apply(temp[2], overlaps[1]);
			}
			html.push('<ul id="context_menu" class="SimpleContextMenu"></ul>');
			error_panel_html = '<div id="error_panel" class="dragdiv warning" style="display:none"><span id="message_summary">Messages</span><span id="error_coll_ex">&#9660;</span><div id="error_message_panel"><span id="error_message">message</span></div></div>';
			document.getElementById('scroller').innerHTML = '<table class="collation_overview">' + html.join('') + '</table>' + error_panel_html;
			
			event_rows = temp[2];
			for (i = 0; i < event_rows.length; i += 1) {
				row = document.getElementById(event_rows[i]);
				CL._add_hover_events(row);
			}			
			SPN.remove_loading_overlay();
			//initialise DnD
			SV.redips_init_sv(CL._data.apparatus.length);
			
			if (SV._undo_stack.length > 0) {
				document.getElementById("undo_button").style.display = 'inline';
			} else {
				document.getElementById("undo_button").style.display = 'none';
			}
			
			CL.add_triangle_functions('list');
			
			// decide if we need to display any messages and display them if we do
			for (i = 0; i < SV._watch_list.length; i += 1) {
				if (SV.check_witness_integrity(SV._watch_list[i])) {
					SV._watch_list[i] = null;
				}
			}
			CL.remove_null_items(SV._watch_list);
			if (options.hasOwnProperty('message') && SV._watch_list.length > 0) {
				SV.set_up_message('warning', options.message.message + '<br/><br/>WARNING: the following witnesses still have words out of order: ' + SV._watch_list.join(', '));
			} else if (options.hasOwnProperty('message')) {
				SV.set_up_message(options.message.type, options.message.message);
			} else if (SV._watch_list.length > 0) {
				SV.set_up_message('warning', 'WARNING: the following witnesses still have words out of order: ' + SV._watch_list.join(', '));
			}
		},

		move_to_reorder: function () {
			var i, all_complete, all_in_order, standoff_problems, extra_results;
			//we are keeping any empty units from the last state of SV
			//we need to combined overlaps with identical index points
			SPN.show_loading_overlay();
			SR._lose_subreadings(); //for preparation and is needed
			all_complete = SV.are_all_units_complete();
			all_in_order = SV.check_all_witnesses_integrity();
			standoff_problems = SV.check_standoff_reading_problems();

			if (all_complete && all_in_order && !standoff_problems[0]) {       	
				extra_results = CL.apply_pre_stage_checks('order_readings');
				if (extra_results[0] === true) {
					CL._show_subreadings = false;
					//we have some legacy data which has not had all of the matching readings in each unit combined
					//so to ensure they are fixed now we need to call the following 3 functions
					//would be nicer to just change the data on the database but it would mean rewriting in python 
					SV.prepare_for_operation();
					SV.remove_splits();
					SV.unprepare_for_operation();
					SR._lose_subreadings(); //for preparation and is needed
					OR.remove_splits(); //ensure all the units are unsplit (readings wise) - still needed
					OR.merge_shared_extent_overlaps(); //do this before adding labels so the labels are correct))
					OR.make_was_gap_words_gaps()
					//merge lacs into a single unit
					//we used to do this with OM as well but om verse should never be merged with OM so I don't run it anymore as there
					//should be no more that one OM and om verse in any given unit.
					//TODO: this one should perhaps be configurable
					//could just be a flag for this and oms
					OR.merge_all_lacs()
					OR.add_labels(true); //this adds the reading labels to the datastructure itself - still required so they can be edited
					//log that we have moved to OR in the event_list
					if (CL._data.hasOwnProperty('event_list')) CL._data.event_list.push('moved to order readings');
					SR._find_subreadings({'rule_classes': CL._get_rule_classes('subreading', true, 'value', ['identifier', 'subreading'])}); //only show the subreadings when there class is labelled as subreading in the project)))
					OR.show_reorder_readings({'container': container});
				} else {
					if (CL._show_subreadings === true) {
						SR._find_subreadings();
					}
					alert(extra_results[1]);
					SPN.remove_loading_overlay();
				}        	
			} else if (!all_complete) {
				if (CL._show_subreadings === true) {
					SR._find_subreadings()
				}
				alert('You cannot move to order readings because one of the units does not have all of its required witnesses');
				SPN.remove_loading_overlay();
			} else if (!all_in_order) {
				if (CL._show_subreadings === true) {
					SR._find_subreadings()
				}
				alert('You cannot move to order readings because one of the witnesses has words out of order');
				SPN.remove_loading_overlay();
				//TODO: more informative errors for the above including highlighting the problems on the screen
			} else if (standoff_problems[0]) {
				if (CL._show_subreadings === true) {
					SR._find_subreadings()
				}
				alert('You cannot move to order readings because ' + standoff_problems[1]);
				SPN.remove_loading_overlay();
			}
		},


		//
		calculate_unit_lengths: function (app_id, options) {
			var i, j, app, top_line, id, start, first_hit, gap_before, last_end, length, gap_counts, highest_gap, gap_after, 
			previous_unit_gap_after, previous_unit_start, previous_unit_end, original_column_lengths;
			top_line = CL._data.apparatus;
			app = CL._data[app_id];

			options.overlap_details = {}; //get rid of the one from the last apparatus
			//copy the original_column_lengths data so we can use to calculate gap_after accurately
			original_column_lengths = JSON.parse(JSON.stringify(options.column_lengths));

			for (i = 0; i < app.length; i += 1) {
				id = app[i]._id;
				//first find real start value
				start = -1;
				for (j = 0; j < top_line.length; j += 1) {
					if (top_line[j].hasOwnProperty('overlap_units') 
							&& top_line[j].overlap_units.hasOwnProperty(id) && start === -1) {
						start = top_line[j].start;
						app[i].start = start;
					}
				}
				length = 0;
				gap_before = 0;
				//find the first hit of this overlap_unit id in the top line
				//recoding the number of units in top line at this index which come before
				first_hit = -1;
				for (j = 0; j < top_line.length; j += 1) {
					if (top_line[j].start === start) {
						if (top_line[j].hasOwnProperty('overlap_units') 
								&& top_line[j].overlap_units.hasOwnProperty(id)) {
							if (first_hit === -1) {
								first_hit = j;
							}
						} else {
							if (first_hit === -1) {
								gap_before += 1;
							} 
						}
					}
				}
				//if we might have a conflict with gaps here then adjust as necessary
				if (start === previous_unit_end) {
					gap_before = Math.max(gap_before - (original_column_lengths[previous_unit_end] - previous_unit_gap_after), 0);
				}
				j = first_hit;
				last_end = null;
				gap_counts = {};
				highest_gap = 0;
				gap_after = 0;
				while (j < top_line.length) {
					if (top_line[j].hasOwnProperty('overlap_units') 
							&& top_line[j].overlap_units.hasOwnProperty(id)) {
						length += top_line[j].end - top_line[j].start + 1;
						if (last_end !== null && last_end + 2 === top_line[j].start) {
							length += 1;
						}
						//now work out what we might need to take off the last position column length
						if (top_line[j].start%2 === 1) { //if we start with odd number
							if (top_line[j].start > highest_gap) {
								highest_gap = top_line[j].start;
							}
							if (gap_counts.hasOwnProperty(top_line[j].start)) {
								gap_counts[top_line[j].start] += 1;
							} else {
								gap_counts[top_line[j].start] = 1;
							}
						}
						last_end = top_line[j].end;
					} else {
						if (top_line[j].start === last_end) {
							gap_after += 1;
						}
					}
					j += 1;
				}
				//change the end value of the overlap
				app[i].end = last_end;
				previous_unit_start = start;
				previous_unit_gap_after = gap_after;
				previous_unit_end = last_end;
				//adjust column length if necessary
				if (last_end%2 === 1) {
					if (gap_counts.hasOwnProperty(highest_gap)) {
						if (options.column_lengths.hasOwnProperty(highest_gap)) {
							options.column_lengths[highest_gap] = options.column_lengths[highest_gap] - gap_counts[highest_gap];
						}
					}
				}
				options.overlap_details[id] = {'col_length': length, 'gap_before': gap_before, 'gap_after': gap_after};
			}           
			return options;
		},


		/** displays warning and error messages on the screen in a draggable and collapsable box */
		set_up_message: function (type, message) {
			document.getElementById('error_message_panel').innerHTML = message;
			$('#error_panel').removeClass('warning');
			$('#error_panel').removeClass('error');
			$('#error_panel').removeClass('clear');
			$('#error_panel').addClass(type);
			if (document.getElementById('error_panel').style.display === 'none') {
				document.getElementById('error_panel').style.display = 'block';
				DND.InitDragDrop(true, false);
			}
			if (SV._message_expanded === true) {
				document.getElementById('error_message_panel').style.display = 'block';
				document.getElementById('error_coll_ex').innerHTML = '&#9660;';
			} else {
				document.getElementById('error_message_panel').style.display = 'none';
				document.getElementById('error_coll_ex').innerHTML = '&#9650;';
			}
			if (SV._message_pos_left !== null) {
				document.getElementById('error_panel').style.left = SV._message_pos_left;
			} else {
				document.getElementById('error_panel').style.top = document.getElementById('scroller').offsetHeight + document.getElementById('header').offsetHeight - document.getElementById('error_panel').offsetHeight - 3 + 'px';
				document.getElementById('error_panel').style.left = document.getElementById('scroller').offsetWidth - document.getElementById('error_panel').offsetWidth - 15 + 'px';
			}
			$('#error_coll_ex').on('click', function (event) {
				if (document.getElementById('error_message_panel').style.display === 'block') {
					document.getElementById('error_panel').style.top = parseInt(document.getElementById('error_panel').style.top) + parseInt(document.getElementById('error_message_panel').offsetHeight) + 'px';
					document.getElementById('error_message_panel').style.display = 'none';
					document.getElementById('error_coll_ex').innerHTML = '&#9650;';
					SV._message_expanded = false;
				} else {
					document.getElementById('error_message_panel').style.display = 'block';
					document.getElementById('error_panel').style.top = parseInt(document.getElementById('error_panel').style.top) - parseInt(document.getElementById('error_message_panel').offsetHeight) + 'px';
					document.getElementById('error_coll_ex').innerHTML = '&#9660;';
					SV._message_expanded = true;
				}
			});
		},

//		display stuff

		/** get the unit data for set variants. Control the display of the data
		 * 	data - the list of readings for the unit
		 * 	id - the identifier for the unit
		 * 	start - the start position of the unit
		 * 	end - the end position of the unit
		 * 	options - dictionary of other options
		 * 		split - boolean - does this unit display as separate readings
		 * 		overlap - boolean - is this unit overlapping
		 * 		gap_unit - boolean - is this a unit which only contains lac/om readings
		 * 		col_length - int - the expected column width based on other table rows
		 * 		highlighted_wit - the witness to highlight
		 * 		highlighted_unit - the unit to highlight
		 * 		created - boolean (is this a specially created gap element)
		 * 		overlapping_ids - a list of ids for any overlapping readings realted to this top line reading
		 * 		td_id - the id for the cell (used in overlap rows to allow readings to be moved between rows))*/
		get_unit_data: function (data, id, start, end, options) {
			var i, j, html, decisions, rows, cells, row_list, temp, events, colspan, row_id, text, split_class,
			hand, highlighted, temp, SV_rules, key, label_suffix, reading_suffix, alpha_id, reading_label;
			html = [];
			row_list = [];
			if (options.hasOwnProperty('highlighted_wit')) {
				hand = options.highlighted_wit.split('|')[1];
			} else {
				hand = null;
			}
			if (options.hasOwnProperty('col_length')) {
				colspan = options.col_length;
			} else {
				colspan = end - start + 1;
			}
			//get all the subreading rules and delete any that stay as main reading
			SV_rules = CL._get_rule_classes(undefined, undefined, 'value', ['identifier', 'keep_as_main_reading', 'suffixed_label', 'suffixed_reading']);
			for (key in SV_rules) {
				if (SV_rules.hasOwnProperty(key) && SV_rules[key][1] === false) {
					delete SV_rules[key];
				}
			}
			if (options.hasOwnProperty('td_id')) {
				html.push('<td id="' + options.td_id + '" class="start_' + start + '" headers="NA_' + start + '" colspan="' + colspan + '">');
			} else {
				html.push('<td class="start_' + start + '" headers="NA_' + start + '" colspan="' + colspan + '">');
			}
			for (i = 0; i < data.length; i += 1) {
				//is it highlighted?
				if (options.hasOwnProperty('highlighted_unit') && parseInt(id) === options.highlighted_unit[1]) {
					highlighted = ' highlighted_unit';
				} else {
					highlighted = '';
				}
				//what is the reading text?
				text = CL.extract_display_text(data[i], i, data.length, options.unit_id, options.app_id);
				if (text.indexOf('system_gen_') !== -1) {
					text = text.replace('system_gen_', '');
				}
				//what labels need to be used?
				reading_label = CL.get_reading_label(i, data[i], SV_rules);
				reading_suffix = CL.get_reading_suffix(data[i], SV_rules);
				//what is the row id? (and add it to the list for adding events)
				row_id = 'variant_unit_' + id + '_row_' + i;
				row_list.push(row_id);
				if (options.hasOwnProperty('split') && options.split === true) {
					if (data[i].hasOwnProperty('overlap_status')) {
						html.push('<div id="' + 'drag_unit_' + id + '_reading_' + i + '" class="drag split_' + data[i].overlap_status + '_unit">');
					} else {
						if (options.hasOwnProperty('overlap') && options.overlap === true) {
							if (i === 0) {
								split_class = 'overlap_split_unit_a';
							} else {
								split_class = 'overlap_split_unit';
							}
						} else {
							if (i === 0) {
								split_class = 'split_unit_a';
							} else {
								split_class = 'drag split_unit';
							}
						}
						html.push('<div id="' + 'drag_unit_' + id + '_reading_' + i + '" class="' + split_class + '">');
					}
					html.push('<ul class="variant_unit" id="variant_unit_' + id + '_reading_' + i + '">');

					if (data[i].witnesses.indexOf(hand) != -1) {
						html.push('<li id="' + row_id + '" class="highlighted">');
					} else {
						html.push('<li id="' + row_id + '" >');
					}
					html.push('<div class="spanlike">' + reading_label + ' ' + text + reading_suffix + '  </div>');
					temp = SV.show_subreadings(data[i], id, i, hand);
					html.push.apply(html, temp[0]);
					row_list.push.apply(row_list, temp[1]);
					html.push('</li>');
					html.push('</ul>');
					html.push('</div>');
				} else {
					if (i === 0) {
						if (options.hasOwnProperty('overlap') && options.overlap === true) {
							html.push('<div id="' + 'drag_unit_' + id + '" class="drag overlap_unit' + highlighted + '">');
						} else if (options.hasOwnProperty('gap_unit') && options.gap_unit === true) {	
							html.push('<div id="' + 'drag_unit_' + id + '" class="drag gap_unit' + highlighted + '">');         
						} else {
							html.push('<div id="' + 'drag_unit_' + id + '" class="drag unit' + highlighted + '">');
						}
						if (data.length > 1) {
							//debug version
							//html.push('<ul class="variant_unit" id="variant_unit_' + id + '"><span>' + id + '</span><span id="toggle_variant_' + id + '" class="triangle">&#9660;</span><br/>');
							//live version
							html.push('<ul class="variant_unit" id="variant_unit_' + id + '"><span id="toggle_variant_' + id + '" class="triangle">&#9660;</span><br/>');
						} else {
							html.push('<ul class="variant_unit" id="variant_unit_' + id + '"><br/>');
						}
						if (data[i].witnesses.indexOf(hand) != -1) {
							html.push('<li id="' + row_id + '" class="top highlighted">');
						} else {
							html.push('<li id="' + row_id + '" class="top">');
						}
					} else {
						if (data[i].witnesses.indexOf(hand) != -1) {
							html.push('<li id="' + row_id + '" class="highlighted">');
						} else {
							html.push('<li id="' + row_id + '" >');
						}
					}
					html.push('<div class="spanlike">' + reading_label  + ' ' + text + reading_suffix + '  </div>');
					temp = SV.show_subreadings(data[i], id, i, hand);
					html.push.apply(html, temp[0]);
					row_list.push.apply(row_list, temp[1]);
					html.push('</li>');
				}                
			}
			html.push('</ul>');
			html.push('</div>');
			html.push('</td>');
			return [html, row_list];
		},


		/** next two functions deal with creation of 'spacer cells'. These cells maintain the width of all table cells
		 * during dragging of units. Without them the table collapses when a unit is dragged */
		get_spacer_unit_data: function (id, start, end, col_length) {
			var colspan;
			if (col_length !== undefined) {
				colspan = col_length + (end - start);
			} else {
				colspan = end - start + 1;
			}
			if (id !== undefined) {
				return '<td  class="mark"colspan="' + colspan + '"><div id="spacer_' + id + '" class="spacer"></div></td>';
			} else {
				return '<td  class="mark"colspan="' + colspan + '"><div class="spacer"></div></td>';
			}
		},

		get_empty_spacer_cell: function (start, end) {
			if (typeof start === 'undefined' || typeof end === 'undefined') {		        
				return '<td class="mark"></td>';
			} else {
				return '<td class="mark" colspan="' + (end - start + 1) + '"></td>';
			}
		},


		/** highlight a witness, called from select box in page footer*/
		highlight_witness: function (witness) {  
			var scroll_offset;
			scroll_offset = [document.getElementById('scroller').scrollLeft,
			                 document.getElementById('scroller').scrollTop];
			CL._highlighted = witness;
			SV.show_set_variants_data({'highlighted_wit': witness});
			CL.get_highlighted_text(witness);
			document.getElementById('scroller').scrollLeft = scroll_offset[0];
			document.getElementById('scroller').scrollTop = scroll_offset[1];
		},

		get_hands_and_sigla: function () {
			var details, key;
			details = []
			for (key in CL._data.hand_id_map) {
				if (CL._data.hand_id_map.hasOwnProperty(key)) {
					details.push({'hand': key.replace('_private', ' (private)'), 'document': CL._data.hand_id_map[key]+ '|' + key})
				}
			}
			details = CL.sort_witnesses(details);
			details = SV.do_private_check(details);
			return details
		},


		do_private_check: function (details) {
			var i, private_hands, published_hands, private_indexes;
			private_hands = [];
			published_hands = [];
			private_indexes = [];
			CL._remove_private_for = [];
			for (i = 0; i < details.length; i += 1) {
				if (details[i].hand.search('(private)') !== -1) {
					private_hands.push(details[i].hand);
					private_indexes.push(i);
				} else {
					published_hands.push(details[i].hand);
				}
			}
			for (i = 0; i < private_hands.length; i += 1) {
				if (published_hands.indexOf(private_hands[i].replace(' (private)', '')) === -1) {
					details[private_indexes[i]].hand = private_hands[i].replace(' (private)', '');
					CL._remove_private_for.push(private_hands[i]);
				}
			}
			return details;
		},

		/** the code for displaying subreadings present in the object model */
		show_subreadings: function (reading, id, i, hand) {
			var html, j, subrow_id, row_list, type, suffixed, suffix, highlighted, text_string;
			html = [];
			row_list = [];
			text_string = ''
			if (reading.hasOwnProperty('subreadings')) {
				html.push('<ul class="subreading_unit" id="subreading_unit_' + id + '_row_' + i + '">');
				for (type in reading.subreadings) {
					if (reading.subreadings.hasOwnProperty(type)) {
						suffix = reading.subreadings[type][0].suffix;
						for (j = 0; j < reading.subreadings[type].length; j += 1) {
							highlighted = '';
							subrow_id = 'subreading_unit_' + id + '_row_' + i + '_type_' + type + '_subrow_' + j;
							row_list.push(subrow_id);
							if (reading.subreadings[type][j].witnesses.indexOf(hand) !== -1) {
								highlighted = ' highlighted';
							}
							if (reading.subreadings[type][j].type === 'lac') {
								text_string = '&lt;' + reading.subreadings[type][j].text_string + '&gt;';
							} else {
								text_string = reading.subreadings[type][j].text_string;
							}
							html.push('<li class="subreading' + highlighted + '" id="' + subrow_id + '"><div class="spanlike"><div class="spanlike">' 
									+ CL.get_alpha_id(i) + suffix 
									+ '. ' + text_string + '</div></div></li>');
						}
					}
				}
				html.push('</ul>');
			}
			return [html, row_list];
		},


		/** initiate the drag and drop 
		 * also some functions and tests for behaviours are included in here*/
		redips_init_sv: function (app_length) {
			var rd, i, unit_num, apparatus_number, source_col, target_col, source_row, target_row, error_mess, triangles,
			unit1, unit2, unit_details, unit, scroll_offset, error_mess, width, is_space;
			rd = REDIPS.drag;
			rd.init();
			rd.event.clicked = function () {
				width = document.getElementById(rd.obj.id).offsetWidth;
				if (document.getElementById(rd.obj.id.replace('drag_unit', 'spacer'))) {
					document.getElementById(rd.obj.id.replace('drag_unit', 'spacer')).style.width = width + 'px';
				}
			};
			rd.event.dropped = function () {        
				scroll_offset = [document.getElementById('scroller').scrollLeft,
				                 document.getElementById('scroller').scrollTop];
				if (rd.td.target.parentElement.id === 'number_row') { //if you drag onto a number
					SV.move_unit(rd);
				} else {
					SV._selected_variant_units = [];
					//get children of target cell (TD) and push to selected list for combining 
					for (i = 0; i < rd.td.target.childNodes.length; i += 1) {
						SV._selected_variant_units.push(CL.get_unit_app_reading(rd.td.target.childNodes[i].childNodes[0].id));
					}
					if (SV._selected_variant_units.length === 2) { // if there are 2
						//if they are from the same line of apparatus
						if (SV._selected_variant_units[0][1] === SV._selected_variant_units[1][1]) {
							//if they are both full units (test if the third item is undefined in which case both are full units would be reading pos if single reading)
							if (typeof SV._selected_variant_units[0][2] === 'undefined' && typeof SV._selected_variant_units[1][2] === 'undefined') {
								SV.combine_units(SV._selected_variant_units, rd);
							} else {
								//at least one is a reading
								SV.move_reading(SV._selected_variant_units, rd);
							}
						} else {
							//we are not currently allowing merging between different lines so display a message and do nothing else
							error_mess = 'ERROR: units from different lines cannot be combined';
							SV.show_set_variants_data({'message': {'type': 'error', 'message': error_mess}});
							document.getElementById('scroller').scrollLeft = scroll_offset[0];
							document.getElementById('scroller').scrollTop = scroll_offset[1];
						}
					} else {
						if (SV._selected_variant_units[0][1] !== 'apparatus') {
							source_col = parseInt(rd.td.source.id.substring(rd.td.source.id.indexOf('_') + 1));
							target_col = parseInt(rd.td.target.id.substring(rd.td.target.id.indexOf('_') + 1));
							if (source_col === target_col) {
								source_row = rd.td.source.id.substring(0, rd.td.source.id.indexOf('_'));
								target_row = rd.td.target.id.substring(0, rd.td.target.id.indexOf('_'));
								is_space = OR.can_unit_move_to(CL._data[SV._selected_variant_units[0][1]][SV._selected_variant_units[0][0]]._id, source_row, target_row);
								if (is_space) {
									//move it to the target row or combine if there are two
									SV.move_overlapping(SV._selected_variant_units[0], target_row);
								} else {
									error_mess = 'ERROR: There is not enough space to relocate this unit to that position.';
									SV.show_set_variants_data({'message': {'type': 'error', 'message': error_mess}});
									document.getElementById('scroller').scrollLeft = scroll_offset[0];
									document.getElementById('scroller').scrollTop = scroll_offset[1];
								}
							} else {
								//illegal move
								//nothing to do
								error_mess = 'ERROR: This unit cannot be moved to that position';
								SV.show_set_variants_data({'message': {'type': 'error', 'message': error_mess}});
								document.getElementById('scroller').scrollLeft = scroll_offset[0];
								document.getElementById('scroller').scrollTop = scroll_offset[1];
							}
						} else {
							//illegal move
							//nothing to do
							SV.show_set_variants_data();
							document.getElementById('scroller').scrollLeft = scroll_offset[0];
							document.getElementById('scroller').scrollTop = scroll_offset[1];
						}
					}
				}
			};
		},


//		reindexing code

		/**This will only ever be used for moving a single reading which will never happen in overlapping variants.
		 * It is also only called if the resulting unit doesn't have the same start and end number which in the main apparatus will only 
		 * happen with an even start and an even end as units are not allowed to start or end on an odd number if the next even number 
		 * is part of the unit so we can assume that we will always start and end on a even number
		 * the reading that is moved has no index numbers (they are stripped as part of the move) so we just need to ensure any moved words get their ids back 
		 * we also need to make sure we are always incrementing left to right (problems sometimes caused by readings being moved into the unit out of sequence) 
		 * so we check that too*/
		reindex_moved_reading: function (location, witnesses) {
			var first_word_index, i, j, k, l, index, start, end, unit, reading, found;
			first_word_index = 1;
			//find the unit
			console.log('reindexing reading')
			for (i = 0; i < CL._data.apparatus.length; i += 1) {
				if (CL._data.apparatus[i].start === location) {
					unit = CL._data.apparatus[i];
					start = unit.start;
					end = unit.end;
					unit.first_word_index = location + '.' + first_word_index; //set the first word index for the unit
					//for each witness in the list
					for (j = 0; j < witnesses.length; j += 1) {
						found = false;
						k = 0;
						while (!found && k < unit.readings.length) {
							if (unit.readings[k].witnesses.indexOf(witnesses[j]) !== -1) {
								found = true;
								for (l = 0; l < unit.readings[k].text.length; l += 1) {
									if (!unit.readings[k].text[l].hasOwnProperty('index') 
											|| typeof unit.readings[k].text[l].index === 'undefined'
												|| (l > 0 && SV.less_than_or_equal_to(unit.readings[k].text[l].index, unit.readings[k].text[l-1].index))) {
										if (l === 0) {
											unit.readings[k].text[l].index = location + '.' + first_word_index;
										} else { 
											unit.readings[k].text[l].index = SV.increment_sub_index(unit.readings[k].text[l-1].index, first_word_index);
										}
									}
								}
							}
							k += 1;
						}
					}
				}
			}          
		},

		less_than: function (index1, index2) {
			var index1_main, index1_sub, index2_main, index2_sub;
			if (typeof index1 === 'undefined' || typeof index2 === 'undefined') {
				return false;
			}
			if (index1.indexOf('.') !== -1) {
				index1_main = parseInt(index1.split('.')[0]);
				index1_sub = parseInt(index1.split('.')[1]);
			} else {
				index1_main = parseInt(index1);
				index1_sub = 0;
			}
			if (index2.indexOf('.') !== -1) {
				index2_main = parseInt(index2.split('.')[0]);
				index2_sub = parseInt(index2.split('.')[1]);
			} else {
				index2_main = parseInt(index2);
				index2_sub = 0;
			}
			if (index1_main === index2_main) {
				if (index1_sub < index2_sub) {
					return true
				}
			} else if (index1_main < index2_main) {
				return true;
			}
			return false;
		},

		less_than_or_equal_to: function (index1, index2) {
			var index1_main, index1_sub, index2_main, index2_sub;
			if (index1.indexOf('.') !== -1) {
				index1_main = parseInt(index1.split('.')[0]);
				index1_sub = parseInt(index1.split('.')[1]);
			} else {
				index1_main = parseInt(index1);
				index1_sub = 0;
			}
			if (index2.indexOf('.') !== -1) {
				index2_main = parseInt(index2.split('.')[0]);
				index2_sub = parseInt(index2.split('.')[1]);
			} else {
				index2_main = parseInt(index2);
				index2_sub = 0;
			}
			if (index1_main === index2_main) {
				if (index1_sub <= index2_sub) {
					return true
				}
			} else if (index1_main <= index2_main) {
				return true;
			}
			return false;
		},

		increment_sub_index: function (current, increment) {
			var main_index, sub_index;
			main_index = parseInt(current.split('.')[0]);
			sub_index = parseInt(current.split('.')[1]);
			if (isNaN(sub_index)) {
				sub_index = 1;
			}
			sub_index = sub_index + increment;
			return main_index + '.' + sub_index;
		},

		decrement_sub_index: function (current, decrement) {
			var main_index, sub_index;
			main_index = parseInt(current.split('.')[0]);
			sub_index = parseInt(current.split('.')[1]);
			sub_index = sub_index - decrement;
			return main_index + '.' + sub_index;
		},

		increment_main_index: function (current, increment) {
			var main_index, sub_index;
			if (current.indexOf('.') !== -1) {
				main_index = parseInt(current.split('.')[0]);
				sub_index = parseInt(current.split('.')[1]);
				main_index = main_index + increment;
				return main_index + '.' + sub_index;
			}
			main_index = parseInt(current);
			return main_index + increment;

		},

		decrement_main_index: function (current, decrement) {
			var main_index, sub_index;
			if (current.indexOf('.') !== -1) {
				main_index = parseInt(current.split('.')[0]);
				sub_index = parseInt(current.split('.')[1]);
				main_index = main_index - decrement;
				return main_index + '.' + sub_index;
			}
			main_index = parseInt(current);
			return main_index - decrement;
		},


		/** reindex the specified unit starting with the location. Or all the units at this location if a multiple entry gap.
		 * This is used when we are relocating units or relocating readings so that split words doesn't return
		 * them back to their original locations but they are properly rooted to the location they have been moved to*/
		reindex_unit: function (location) {
			var i, first_word_index;
			first_word_index = 1;
			for (i = 0; i < CL._data.apparatus.length; i += 1) {
				if (CL._data.apparatus[i].start === location) {
					CL._data.apparatus[i].first_word_index = location + '.' + first_word_index;
					first_word_index = SV.reindex_readings(CL._data.apparatus[i].readings, location, first_word_index);
				}
			}
		},

		/** reindex all the readings in the unit (called by reindex_unit)*/
		reindex_readings: function (readings, location, first_word_index) {
			var i, j, next_allocation, counter;
			next_allocation = first_word_index;
			for (i = 0; i < readings.length; i += 1) {
				counter = first_word_index;
				if (readings[i].text.length === 0) {
					//remove the index key from any om readings
					if (readings[i].hasOwnProperty('index')) {
						delete readings[i].index;
					}
				}
				for (j = 0; j < readings[i].text.length; j += 1) {
					readings[i].text[j].index = location + '.' + counter;
					counter += 1;
				}
				if (counter > next_allocation) {
					next_allocation = counter;
				}  
			}
			if (counter === next_allocation) {
				next_allocation += 1;
			}
			return next_allocation;
		},

		check_and_fix_index_order: function (location) {
			var i, j;
			for (i = 0; i < CL._data.apparatus.length; i += 1) {
				if (CL._data.apparatus[i].start === location) {
					for (j = 0; j < CL._data.apparatus[i].readings.length; j += 1) {
						SV.check_and_fix_reading_indexes(CL._data.apparatus[i].readings[j]);
					}
				}
			}
		},

		check_and_fix_reading_indexes: function (reading) {
			var i;
			for (i = 0; i < reading.text.length; i += 1) {
				if (i+1 < reading.text.length) {
					if (!SV.less_than(reading.text[i].index, reading.text[i+1].index)) {
						reading.text[i+1].index = SV.increment_sub_index(reading.text[i].index, 1);
					}
				}
			}
		},

//		split and unsplit readings        

/** split the display of a unit's readings so they can be manipulated separately */
split_readings: function (details) {
	var scroll_offset;
	scroll_offset = [document.getElementById('scroller').scrollLeft, 
	                 document.getElementById('scroller').scrollTop];
	CL._data[details[1]][details[0]].split_readings = true;
	SV.show_set_variants_data();
	document.getElementById('scroller').scrollLeft = scroll_offset[0];
	document.getElementById('scroller').scrollTop = scroll_offset[1];
},

/** recombine the display of a unit's readings */
unsplit_readings: function (details) {
	var scroll_offset, warning_mess;
	scroll_offset = [document.getElementById('scroller').scrollLeft, 
	                 document.getElementById('scroller').scrollTop];
	SV.prepare_for_operation(); //we do this because we have to sort out split witnesses as well
	delete CL._data[details[1]][details[0]].split_readings;
	SV.unsplit_unit_witnesses(details[0], details[1]);
	SV.unprepare_for_operation();
	SV.check_bug_status('recombine', 'readings in unit ' + details[0] + 'in  apparatus ' + details[1] + '.');
	SV.show_set_variants_data();
	document.getElementById('scroller').scrollLeft = scroll_offset[0];
	document.getElementById('scroller').scrollTop = scroll_offset[1];
},

//TODO: does this do anything?
has_duplicate_reading: function (unit_id, app_id) {
	var unit, i;
	unit = CL._data[app_id][parseInt(unit_id, 10)];
	for (i = 0; i < unit.readings.length; i += 1) {
		if (unit.readings[i].hasOwnProperty('duplicate')) {
			return true;
		}
	}
	return false
},

//split and unsplit witnesses


create_new_reading: function (unit, reading_type, extra_details) {
	var i, new_reading, text, orig_reading_details, reading_details, index, id, timestamp, joining_mode, joined;
	//check it's not already a reading and if it is just return the id of that reading
	for (i = 0; i < unit.readings.length; i += 1) {
		if (reading_type === 'om' && CL.extract_witness_text(unit.readings[i]) === 'om.') {
			return unit.readings[i]._id
		}
		if (CL.extract_witness_text(unit.readings[i]) === extra_details) {
			return unit.readings[i]._id
		} 
		if (CL.extract_witness_text(unit.readings[i]) === '&lt;' + extra_details + '&gt;') {
			return unit.readings[i]._id
		}
	}
	//if its not already a reading you can add one
	timestamp = new Date().getTime(); //timestamp ensures the MD5 is unique (but is probably overkill)
	if (reading_type === 'om') {
		id = MD5(unit.start + unit.end + 'om.' + timestamp);
		new_reading = {'_id': id, 'created': true, 'text': [], 'witnesses': [], 'type': 'om'};
	} else if (reading_type === 'gap') {
		id = MD5(unit.start + unit.end + extra_details + timestamp);
		new_reading = {'_id': id, 'created': true, 'text': [], 'witnesses': [], 'type': 'lac', 'details': extra_details};
	} else if (reading_type === 'other') {
		//readings created here will always be fake (i.e. not be the reading of any witness.
		//we cannot deal with gaps using gap_after because we have no 'witness' to this reading before the current unit as we are making the reading up
		//even so it is probably best that the gap counts as a single token so we will rejoin anything between < and > into a single token.
		//I think that is the best we can do with these fake readings
		text = [];
		orig_reading_details = extra_details.split(' ');
		reading_details = [];
		joined = [];
		joining_mode = false;
		//because someone might have legitimitely types spaces inside <> to do something like <lac 1 char> we need to reunify these
		for (i = 0; i < orig_reading_details.length; i += 1) {
			if (!joining_mode && orig_reading_details[i].indexOf('&lt;') !== -1 && orig_reading_details[i].indexOf('&gt;') === -1) {
				joining_mode = true;
				joined.push(orig_reading_details[i]);
			} else if (joining_mode) {
				joined.push(orig_reading_details[i]);
				if (orig_reading_details[i].indexOf('&gt;') !== -1) {
					reading_details.push(joined.join(' '));
					joining_mode = false;
					joined = [];
				}
			} else {
				reading_details.push(orig_reading_details[i]);
			}
		}
		//just check we don't still have any in the joined stack
		if (joined.length > 0) {
			reading_details.push(joined.join(' '));
		}
		//reading_details = orig_reading_details;
		id = MD5(unit.start + unit.end + extra_details + timestamp);
		for (i = 0; i < reading_details.length; i += 1) {
			index = i*2;
			text.push({'index': index.toString(),'interface': reading_details[i], 'reading': []});
		}
		new_reading = {'_id': id, 'created': true, 'text': text, 'witnesses': []};
	}
	unit.readings.push(new_reading);
	return new_reading._id;
},

/** remove references to the given witness from  a list of tokens
 * 
 * 
 * */
remove_witness_from_tokens: function (tokens, witness) {
	var i, index;
	for (i = 0; i < tokens.length; i += 1) {
		index = tokens[i].reading.indexOf(witness);
		if (index !== -1) {
			tokens[i].reading.splice(index, 1);
		}
		if (tokens[i].hasOwnProperty(witness)) {
			delete tokens[i][witness];
		}
	}
},

/** remove references to the given witness from the given reading (deleting entries as necessary (will not delete reading itself even if no witnesses remain)*/
remove_witness_from_reading: function (reading, witness) {
	var i, j, key;
	if (reading.witnesses.indexOf(witness) !== -1) {
		reading.witnesses.splice(reading.witnesses.indexOf(witness), 1);
		SV.remove_witness_from_tokens(reading.text, witness);
	}
	//now check subreadings
	if (reading.hasOwnProperty('subreadings')) {
		for (key in reading.subreadings) {
			if (reading.subreadings.hasOwnProperty(key)) {
				for (i = 0; i < reading.subreadings[key].length; i += 1) {
					if (reading.subreadings[key][i].witnesses.indexOf(witness) !== -1) {
						reading.subreadings[key][i].witnesses.splice(reading.subreadings[key][i].witnesses.indexOf(witness), 1);
						if (reading.subreadings[key][i].witnesses.length === 0) {
							reading.subreadings[key][i] = null;
						}
						if (reading.subreadings[key][i] !== null) {
							SV.remove_witness_from_tokens(reading.subreadings[key][i].text, witness);
						}
					}
				}
				CL.remove_null_items(reading.subreadings[key]);
			}
			if (reading.subreadings[key].length === 0) {
				delete reading.subreadings[key];
			}
		}
		if ($.isEmptyObject(reading.subreadings)) {
			delete reading.subreadings;
		}
	}  
	//now check all the other places we could be hiding references to a witness
	if (reading.hasOwnProperty('SR_text')) {
		for (key in reading.SR_text) {
			if (reading.SR_text.hasOwnProperty(key)) {
				if (key === witness) {
					delete reading.SR_text[key];
				}
			}
		}
		if ($.isEmptyObject(reading.SR_text)) {
			delete reading.SR_text;
		}
	}
	if (reading.hasOwnProperty('standoff_subreadings') && reading.standoff_subreadings.indexOf(witness) !== -1) {
		reading.standoff_subreadings.splice(reading.standoff_subreadings.indexOf(witness), 1);
		if (reading.standoff_subreadings.length === 0) {
			delete reading.standoff_subreadings;
		}
	}
	if (reading.hasOwnProperty('combined_gap_after_subreadings') && reading.combined_gap_after_subreadings.indexOf(witness) !== -1) {
		reading.combined_gap_after_subreadings.splice(reading.combined_gap_after_subreadings.indexOf(witness), 1);
		if (reading.combined_gap_after_subreadings.length === 0) {
			delete reading.combined_gap_after_subreadings;
		}
	}
	if (reading.hasOwnProperty('combined_gap_before_subreadings') && reading.combined_gap_before_subreadings.indexOf(witness) !== -1) {
		reading.combined_gap_before_subreadings.splice(reading.combined_gap_before_subreadings.indexOf(witness), 1);
		if (reading.hasOwnProperty('combined_gap_before_subreadings_details')) {
			delete reading.combined_gap_before_subreadings_details[witness];
		}
		if (reading.combined_gap_before_subreadings.length === 0) {
			delete reading.combined_gap_before_subreadings;
			delete reading.combined_gap_before_subreadings_details;
		}
	}
},

/** this assumes combined gap details for subreadings are correct and simply checks to see if the one in the text tokens of the main reading are required or not */
check_combined_gap_flags: function (reading) {
	if (reading.text.length > 0) {
		if (reading.text[0].hasOwnProperty('combined_gap_before')) {
			if (reading.text[0].combined_gap_before.length === 0) {
				if (!reading.hasOwnProperty('combined_gap_before_subreadings')) {
					delete reading.text[0].combined_gap_before;
				}
			}
		}
		if (reading.text[0].hasOwnProperty('combined_gap_after')) {
			if (reading.text[0].combined_gap_after.length === 0) {
				if (!reading.hasOwnProperty('combined_gap_after_subreadings')) {
					delete reading.text[0].combined_gap_after;
				}
			}
		}
	}
},

/** split supplied witnesses away from others in the reading */
do_split_reading_witnesses: function (unit_num, reading_pos, witness_list, apparatus, log, id_for_new_reading) {
	var i, original_unit, a_reading, reading, new_reading, new_witness_list, original_removed;
//	console.log('>>>> ' + id_for_new_reading)
	if (apparatus === undefined) {
		apparatus = 'apparatus';
	}
	original_unit = CL._data[apparatus][unit_num];
	a_reading = original_unit.readings[0];
	reading = original_unit.readings[reading_pos];
	//copy the original reading to make a the new one
	new_reading = JSON.parse(JSON.stringify(reading));
	//remove readings on witness_list from the original reading 
	for (i = 0; i < witness_list.length; i += 1) {
		SV.remove_witness_from_reading(reading, witness_list[i]);
	}
	//if no witnesses left at all and there are no subreadings then delete the original reading
	if (reading.witnesses.length === 0 && !reading.hasOwnProperty('subreadings')) {
		original_unit.readings.splice(reading_pos, 1);
		original_removed = true;
	} else {
		SV.check_combined_gap_flags(reading);
		original_removed = false;
	}
	//remove all not on witness_list from new_reading
	new_witness_list = CL.get_all_reading_witnesses(new_reading); //a copy so we aren't manipulating what we are looping!
	for (i = 0; i < new_witness_list.length; i += 1) {
		if (witness_list.indexOf(new_witness_list[i]) === -1) {
			SV.remove_witness_from_reading(new_reading, new_witness_list[i]);
		}
	}
	SV.check_combined_gap_flags(new_reading);
	if (typeof id_for_new_reading !== 'undefined') {
		new_reading._id = id_for_new_reading;
		original_unit.readings.splice(reading_pos + 1, 0, new_reading); //add the new reading into the unit, we know this is an addition because it has a supplied id
		return new_reading._id;
	} else if (original_removed === true) {
		if (!new_reading.hasOwnProperty('_id')) {
			CL.add_reading_id(new_reading, original_unit.start, original_unit.end);
		}
		original_unit.readings.splice(reading_pos, 0, new_reading); //add the new reading into the unit
		return new_reading._id;
	} else {
		//change id of new reading so it is distinct from the original one
		//in the if loop we deleted the original so id can stay!
		CL.add_reading_id(new_reading, original_unit.start, original_unit.end);
		original_unit.readings.splice(reading_pos + 1, 0, new_reading); //add the new reading into the unit
//		console.log(JSON.parse(JSON.stringify(original_unit.readings)));
		return new_reading._id;
	}
	if (log) {
		SV.check_bug_status('split witnesses', 'in ' + apparatus + ' unit ' + unit_num + ' reading ' + reading_pos + ' witnesses ' + witness_list.join(',') + '.');
	}
},

remove_separated_witness_data: function (app_id, unit_id) {
	var i;
	if (CL._data.hasOwnProperty('separated_witnesses')) {
		for (i = 0; i < CL._data.separated_witnesses.length; i += 1) {
			if (CL._data.separated_witnesses[i].app_id === app_id && CL._data.separated_witnesses[i].unit_id === unit_id) {
				CL._data.separated_witnesses[i] = null;
			}
		}
		CL._data.separated_witnesses = CL.remove_null_items(CL._data.separated_witnesses);            
	}
},


/** recombine the witnesses of any identical readings 
 * 
 * should always have called prepare_for_operation before calling this
 * so subreadings are always hidden and standoff readings are always main readings
 * after this unprepare_for_operation will run find subreadings
 * at the end of this operation standoff marked readings should still be main readings even if they share a parent with another reading
 * we only need to combined readings that are not marked as standoff
 * */
unsplit_unit_witnesses: function (unit_num, app_id) {
	var i, j, k, text, unit, reading, reading_list, index, witness, current, standoff_record, is_standoff;
	reading_list = [];
	unit = CL._data[app_id][unit_num];

	SV.remove_separated_witness_data(app_id, unit._id);
	
	for (i = 0; i < unit.readings.length; i += 1) {
		reading = unit.readings[i];
		//get the text and add '_a' if it is the first reading of an overlapped unit (although I don't think we ever call this on overlapped units anymore)
		text = CL.extract_witness_text(reading, {'app_id': app_id, 'unit_id': unit._id}); 
		if (i === 0 && app_id !== 'apparatus') {
			text = text + '_a';
		}
		if (reading.hasOwnProperty('overlap_status')) {
			if (reading.overlap_status === 'duplicate') {
				text = text + '_OLSTS_duplicate' + i; //make sure each duplicate is unique because we do not want to merge these - they might need to be treated differently
			} else {
				text = text + '_OLSTS_' + reading.overlap_status; //the capital letters are there to help ensure no clash with any real words
			}
		}
		//find out if this is a standoff reading
		//at this point all witnesses to the reading should be standoff if it is a standoff reading made into a main reading so just check first witness (and keep fingers crossed!)
		is_standoff = true;                
		standoff_record = CL.find_standoff_regularisation(unit, reading.witnesses[0], app_id);
		if (standoff_record === null) {
			is_standoff = false;
		}
		//ignore standoff readings
		if (is_standoff === true) {
			reading_list.push(null);
		} else {
			index = reading_list.indexOf(text);
			if (index !== -1 && text.length > 0) { //if we have text and the reading is already in the list of readings
				reading_list.push(null); //needed so our list indexes stay alligned with the readings in the unit
				for (j = 0; j < reading.witnesses.length; j += 1) {
					if (unit.readings[index].witnesses.indexOf(reading.witnesses[j]) === -1) {
						unit.readings[index].witnesses.push(reading.witnesses[j]);
					}
				}
				//put individual details for each witness in the new reading
				for (j = 0; j < reading.witnesses.length; j += 1) {
					witness = reading.witnesses[j];
					for (k = 0; k < reading.text.length; k += 1) {
						if (reading.text[k].hasOwnProperty(witness)) {
							unit.readings[index].text[k][witness] = reading.text[k][witness];                                  
						}
						//check if any readings need the regularised flag (because some witnesses have decisions to apply)
						if (unit.readings[index].text[k][witness].hasOwnProperty('decision_class')) {
							unit.readings[index].text[k].regularised = true;
						}
					}
				}
				//append the new witnesses to reading and doc_id inside text
				for (j = 0; j < unit.readings[index].text.length; j += 1) {
					for (k = 0; k < reading.text[j].reading.length; k += 1) {
						if (unit.readings[index].text[j].reading.indexOf(reading.text[j].reading[k]) === -1) {
							unit.readings[index].text[j].reading.push(reading.text[j].reading[k]);
						}
					}
				}
				unit.readings[i] = null;
			} else if (index !== -1 && text.length === 0 && reading.type === 'om') {
				reading_list.push(null); //needed so our list indexes stay alligned with the readings in the unit
				if (unit.readings[index].type === 'om') {
					unit.readings[index].witnesses.push.apply(unit.readings[index].witnesses, reading.witnesses);
					reading = null;
				} 
			} else {
				reading_list.push(text);
			}
		}

	}
	CL.remove_null_items(unit.readings); 
},


/** Combine/Move stuff */

get_overlapped_witnesses_for_unit: function (unit_pos) {
	var key, i, witnesses, unit;
	witnesses = [];
	unit = CL._data.apparatus[unit_pos];
	if (!unit.hasOwnProperty('overlap_units')) {
		return [];
	}
	for (key in unit.overlap_units) {
		if (unit.overlap_units.hasOwnProperty(key)) {
			for (i = 0; i < unit.overlap_units[key].length; i += 1) {
				if (witnesses.indexOf(unit.overlap_units[key][i]) === -1) {
					witnesses.push(unit.overlap_units[key][i]);
				}
			}
		}
	}
	return witnesses;
},

separate_overlap_witnesses: function (unit_num, gap_location) {
	var overlapped_witnesses, to_add, unit, i , j, to_split, new_reading_id, new_reading, to_add;
	//get the overlapped witnesses for this point
	if (typeof gap_location !== 'undefined') {
		overlapped_witnesses = SV.get_overlapped_witnesses_for_gap(gap_location);
	} else {
		overlapped_witnesses = SV.get_overlapped_witnesses_for_unit(unit_num);
	}
	if (overlapped_witnesses.length > 0) {
		unit = CL._data.apparatus[unit_num];
		for (i = unit.readings.length-1; i >= 0; i -= 1) {
			if (!unit.readings[i].hasOwnProperty('overlap_status') 
					|| (unit.readings[i].hasOwnProperty('overlap_status') 
							&& unit.readings[i].overlap_status === 'duplicate')) {
				to_split = [];
				for (j = 0; j < unit.readings[i].witnesses.length; j += 1) {
					if (overlapped_witnesses.indexOf(unit.readings[i].witnesses[j]) !== -1) {
						to_split.push(unit.readings[i].witnesses[j]);    	    		    
					}
				}
				if (to_split.length > 0) {
					to_add = SV.separate_individual_overlap_witnesses(to_split, unit.overlap_units);
					for (j = 0; j < to_add.length; j += 1) {
						new_reading_id = SV.do_split_reading_witnesses(unit_num, i, to_add[j][0], 'apparatus', false);
						new_reading = CL.find_reading_by_id(unit, new_reading_id);
						if (to_add[j][1].hasOwnProperty('type')) {
							new_reading.type = to_add[j][1].type;
						} else {
							new_reading.type = 'om';
						}
						if (to_add[j][1].hasOwnProperty('details')) {
							new_reading.details = to_add[j][1].details;
						} else {
							delete new_reading.details; //for some readon SV.do_split_reading_witnesses adds incorrect details so for now we are overwriting them because that code is used in many other places and I don't want to break them!
						}
						new_reading.overlap_status = 'duplicate';
					}
				}
			}
		}
	}
},

/** reposition an entire unit to a different index point (this only works from odd numbered index point to odd numbered index point)*/
do_move_whole_unit: function (target_location, original_location, unit_num) {
	var scroll_offset, problems, warning_mess;
	//then move the whole unit
	scroll_offset = [document.getElementById('scroller').scrollLeft,
	                 document.getElementById('scroller').scrollTop];
	//check that the unit is not currently associated with an overlapped unit
	//AND that the location its moving to is either not part of an overlapped unit or is but with om or lac readings for overlapped witnesses
	//OR it has overlapping units and the new gap has the same ones
	if ((!CL._data.apparatus[unit_num].hasOwnProperty('overlap_units') 
			&& !SV.target_has_overlap_conflict(target_location, unit_num))
			|| (CL._data.apparatus[unit_num].hasOwnProperty('overlap_units') 
					&& JSON.stringify(CL._data.apparatus[unit_num].overlap_units) === JSON.stringify(SV.get_overlap_details_for_gap(target_location)))) {
		SV.prepare_for_operation();
		SV.add_to_undo_stack(CL._data);
		CL._data.apparatus[unit_num].start = target_location;
		CL._data.apparatus[unit_num].end = target_location;
		CL._data.apparatus[unit_num].first_word_index = CL._data.apparatus[unit_num].first_word_index.first_word_index;
		if (SV.get_overlapped_witnesses_for_gap(target_location).length > 0) {
			CL._data.apparatus[unit_num].overlap_units = SV.get_overlap_details_for_gap(target_location);
			SV.separate_overlap_witnesses(unit_num, target_location);
		}	
		//sort the result
		CL._data.apparatus.sort(CL.compare_first_word_indexes);
		//reindex the moved unit
		SV.reindex_unit(target_location);
		//sort it again (this needs to be two stages to preserve word order)
		CL._data.apparatus.sort(CL.compare_first_word_indexes);
		SV.unprepare_for_operation();
		SV.check_bug_status('move', 'unit ' + unit_num + ' to index ' + target_location + ' in apparatus.');
		problems = SV.check_word_order_integrity(original_location, target_location);
		if (problems.length > 0) {
			warning_mess = 'WARNING: Moving the unit has created word order problems in following witnesses: ' + problems.join(', ');
			SV.show_set_variants_data({'message': {'type': 'warning', 'message': warning_mess}});
		} else {
			SV.show_set_variants_data();
		} 
		document.getElementById('scroller').scrollLeft = scroll_offset[0];
		document.getElementById('scroller').scrollTop = scroll_offset[1];
	} else {
		warning_mess = 'ERROR: This unit cannot be moved here because of a conflict with the overlapping variant';
		SV.show_set_variants_data({'message': {'type': 'error', 'message': warning_mess}});
		document.getElementById('scroller').scrollLeft = scroll_offset[0];
		document.getElementById('scroller').scrollTop = scroll_offset[1];
	}
},

/* find out if the index point recieving the new unit is part of an overlap*/
target_has_overlap_conflict: function (gap_location, unit_num, reading) {
	var overlapped_witnesses, i, unit, j;
	overlapped_witnesses = SV.get_overlapped_witnesses_for_gap(gap_location);
	if (overlapped_witnesses.length > 0) {
		if (typeof reading !== 'undefined') { //the test for moving a single reading
			for (j = 0; j < reading.witnesses.length; j += 1) {
				if (overlapped_witnesses.indexOf(reading.witnesses[j]) !== -1) {
					//if any of the witnesses to the reading being moved are overlapped then return true
					return true;
				}
			}
		} else { //the test for moving a whole unit
			unit = CL._data.apparatus[unit_num];
			for (i = 0; i < unit.readings.length; i += 1) {
				if (unit.readings[i].text.length > 0) {
					for (j = 0; j < unit.readings[i].witnesses.length; j += 1) {
						if (overlapped_witnesses.indexOf(unit.readings[i].witnesses[j]) !== -1) {
							//if any of the witnesses with text (i.e. not lac or om) in the unit being moved are overlapped then return true
							return true;
						}
					}
				}
			}
		}
	}
	return false;       	
},

/* only used when moving a single reading to a new odd numered index point
        /* checks to see if the reading being moved has any overlapped witnesses at its current location */
source_has_overlap_conflict: function (unit_num, reading) {
	var overlapped_witnesses, i, unit, key;
	unit = CL._data.apparatus[unit_num];
	if (!unit.hasOwnProperty('overlap_units')) {
		return false;
	}
	overlapped_witnesses = [];
	for (key in unit.overlap_units) {
		if (unit.overlap_units.hasOwnProperty(key)) {
			overlapped_witnesses.push.apply(overlapped_witnesses, unit.overlap_units[key]);
		}   	
	}
	for (i = 0; i < reading.witnesses.length; i += 1) {
		if (overlapped_witnesses.indexOf(reading.witnesses[i]) !== -1) {
			return true;
		}
	}
	return false
},

all_overlaps_match: function(gap_location, unit_num) {
	var key, i, unit, gap_overlapped_witnesses, unit_overlapped_witnesses;
	unit = CL._data.apparatus[unit_num];
	if (!unit.hasOwnProperty('overlap_units')) {
		return false;
	}
	gap_overlapped_witnesses = SV.get_overlap_details_for_gap(gap_location);
	unit_overlapped_witnesses = unit.overlap_units;
	for (key in unit_overlapped_witnesses) {
		if (unit_overlapped_witnesses.hasOwnProperty(key) && gap_overlapped_witnesses.hasOwnProperty(key)) {
			if (unit_overlapped_witnesses[key].length === gap_overlapped_witnesses[key].length) {
				for (i = 0; i < unit_overlapped_witnesses[key].length; i += 1) {
					if (gap_overlapped_witnesses[key].indexOf(unit_overlapped_witnesses[key][i]) === -1) {
						return false;
					}
				}
			} else {
				return false;
			}
		} else {
			return false;
		}
	}
	return true;
},

neighbours_share_overlaps: function (index_point) {
	var i, before, after;
	for (i = 0; i < CL._data.apparatus.length; i += 1) {
		if (CL._data.apparatus[i].end === index_point - 1) {
			before = CL._data.apparatus[i];
		}
		if (CL._data.apparatus[i].start === index_point + 1) {
			after = CL._data.apparatus[i];
		}
	}
	if (!after || !before) {
		return false;
	}
	if (!before.hasOwnProperty('overlap_units') && !after.hasOwnProperty('overlap_units')) {
		return false;
	}
	if (before.hasOwnProperty('overlap_units') && after.hasOwnProperty('overlap_units')) {
		if (JSON.stringify(before.overlap_units) === JSON.stringify(after.overlap_units)) {
			return true;
		}
	}
	return false;
},

/** reposition an single reading to a different index point (this only works to odd numbered index point)*/
//TODO: need to prevent this happening when overlaps are present below
do_move_single_reading: function (target_location, original_location, unit_num, rd) {
	var scroll_offset, witnesses, i, newunit, readings, unit2, reading, added, problems, warning_mess,
	rdg_details, replacement_readings, newunit_id, newunit_pos;
	//move the single reading
	scroll_offset = [document.getElementById('scroller').scrollLeft,
	                 document.getElementById('scroller').scrollTop];

	//get some details we need to check for overlap
	unit2 = CL._data.apparatus[unit_num];
	rdg_details = CL.get_unit_app_reading(rd.obj.id);
	//get the reading you've moved
	reading = unit2.readings[rdg_details[2]];
	if (!reading.hasOwnProperty('overlap_status') || reading.overlap_status === 'duplicate') {
		if ((!SV.target_has_overlap_conflict(target_location, unit_num, reading) && !SV.source_has_overlap_conflict(unit_num, reading))
				|| (SV.all_overlaps_match(target_location, unit_num) && reading.text.length > 0)) { //last condition allows movement to gaps within the same overlap unit set

			SV.prepare_for_operation();
			SV.add_to_undo_stack(CL._data);
			//get all the witnesses
			witnesses = [];
			for (i = 0; i < CL._data.apparatus[unit_num].readings.length; i += 1) {
				witnesses.push.apply(witnesses, CL._data.apparatus[unit_num].readings[i].witnesses);
			}
			//make a new unit
			//need to observe lac_verse and om_verse and om all other witnesses
			newunit = {};
			newunit.start = target_location;
			newunit.end = target_location;
			//get the unit you moved the word from
			readings = [];
			readings.push(reading);
			//if unit2 has overlap_units key then copy this to new unit
			//TODO: this should not happen if it is not in the overlap unit anymore
			//only add this if the target_gap is part of the overlapping unit

			if (unit2.hasOwnProperty('overlap_units') && SV.neighbours_share_overlaps(target_location)) {
				newunit.overlap_units = unit2.overlap_units;
			}
			for (i = 0; i < reading.witnesses.length; i += 1) {
				witnesses.splice(witnesses.indexOf(reading.witnesses[i]), 1);
			}
			if (CL._data.lac_readings.length > 0) {
				readings.push({'text' : [], 'type' : 'lac_verse', 'details' : 'lac verse', 'witnesses' : CL._data.lac_readings});
				for (i = 0; i < CL._data.lac_readings.length; i += 1) {
					witnesses.splice(witnesses.indexOf(CL._data.lac_readings[i]), 1);
				}
			}
			if (CL._data.om_readings.length > 0) {
				readings.push({'text' : [],
					'type' : 'om_verse',
					'details' : 'om verse',
					'witnesses' : JSON.parse(JSON.stringify(CL._data.om_readings))});
				for (i = 0; i < CL._data.om_readings.length; i += 1) {
					witnesses.splice(witnesses.indexOf(CL._data.om_readings[i]), 1);
				}
			}
			if (witnesses.length > 0) {
				readings.push({'text' : [],
					'witnesses' : witnesses});
			}

			newunit.readings = readings;
			//remove original
			unit2.readings.splice(rdg_details[2], 1);
			//replace it with an om reading or two depending on overlap status
			replacement_readings = SV.get_replacement_om_reading(unit2, reading);
			for (i = 0; i < replacement_readings.length; i += 1) {
				CL.add_reading_id(replacement_readings[i], unit2.start, unit2.end);
				unit2.readings.push(replacement_readings[i]);
			}
			SV.unsplit_unit_witnesses(unit_num, 'apparatus'); //merge with any other oms if needed

			newunit_id = CL.add_unit_id(newunit, 'apparatus');
			CL.add_reading_ids(newunit);
			//add the new unit to the apparatus (we can't actually calculate where in the list this gap is so just stick it on the end then sort
			CL._data.apparatus.push(newunit);
			//sort the apparatus
			CL._data.apparatus.sort(CL.compare_first_word_indexes);
			//reindex the moved unit - this works because target location actually becomes start index in the function
			SV.reindex_unit(target_location);
			newunit_pos = CL.find_unit_pos_by_id('apparatus', newunit_id);
			CL._data.apparatus = CL.remove_null_items(CL._data.apparatus);
			if (SV.get_overlapped_witnesses_for_gap(target_location).length > 0) {
				CL._data.apparatus[newunit_pos].overlap_units = SV.get_overlap_details_for_gap(target_location);
				SV.separate_overlap_witnesses(newunit_pos, target_location);
			}
			//see if the unit that things were moved out of needs deleting or not
			//
			if (!CL.unit_has_text(unit2)) {
				if (!unit2.hasOwnProperty('overlap_units')) {
					CL._data.apparatus[unit_num] = null;
				}
			}
			CL._data.apparatus = CL.remove_null_items(CL._data.apparatus);
			//sort the apparatus again - it is important to do this twice (before and after reindexing) but the reason eludes me just now
			CL._data.apparatus.sort(CL.compare_first_word_indexes);
			SV.unprepare_for_operation();
			SV.check_bug_status('move', 'reading ' + rdg_details[2] + ' with witnesses ' + witnesses.join(', ') +  ' from unit ' + unit_num + ' to index ' + target_location + ' in apparatus.');
			problems = SV.check_word_order_integrity(original_location, target_location, reading.witnesses);
			if (problems.length > 0) {
				warning_mess = 'WARNING: Moving the reading has created word order problems in following witnesses: ' + problems.join(', ');
				SV.show_set_variants_data({'message': {'type': 'warning', 'message': warning_mess}});
			} else {
				SV.show_set_variants_data();
			} 
			document.getElementById('scroller').scrollLeft = scroll_offset[0];
			document.getElementById('scroller').scrollTop = scroll_offset[1];
		} else {
			warning_mess = 'ERROR: This reading cannot be moved here because of a conflict with the overlapping variant';
			SV.show_set_variants_data({'message': {'type': 'error', 'message': warning_mess}});
			document.getElementById('scroller').scrollLeft = scroll_offset[0];
			document.getElementById('scroller').scrollTop = scroll_offset[1];
		}
	} else {
		warning_mess = 'ERROR: Deleted and overlapped readings cannot be relocated (they can be overwritten by another word)';
		SV.show_set_variants_data({'message': {'type': 'error', 'message': warning_mess}});
		document.getElementById('scroller').scrollLeft = scroll_offset[0];
		document.getElementById('scroller').scrollTop = scroll_offset[1];
	}
},

unit_at_location: function (target_location) {
	var i;
	for (i = 0; i < CL._data.apparatus.length; i += 1) {
		if (CL._data.apparatus[i].start === target_location) {
			return true;
		}
	}
	return false;
},

get_overlap_details_for_gap: function (gap_index) {
	var i, key, unit_before, unit_after, overlap_units;
	overlap_units = {};
	for (i = 0; i < CL._data.apparatus.length; i += 1) {
		if (CL._data.apparatus[i].end === gap_index - 1) {
			unit_before = CL._data.apparatus[i];
		}
		if (CL._data.apparatus[i].start === gap_index + 1) {
			unit_after = CL._data.apparatus[i];
		}
		if (typeof unit_before !== 'undefined' && typeof unit_after !== 'undefined') {
			if (unit_before.hasOwnProperty('overlap_units') && unit_after.hasOwnProperty('overlap_units')) {
				for (key in unit_before.overlap_units) {
					if (unit_before.overlap_units.hasOwnProperty(key) && unit_after.overlap_units.hasOwnProperty(key)) {
						overlap_units[key] = unit_before.overlap_units[key];
					}
				}
			}
		}
	}
	return overlap_units;
},

/** return all overlapped witnesses for overlaps that contain this index point (odd numbered indexes only) */
get_overlapped_witnesses_for_gap: function (gap_index) {
	var i, j, key, unit_before, unit_after, overlapped_witnesses;
	overlapped_witnesses = [];
	for (i = 0; i < CL._data.apparatus.length; i += 1) {
		if (CL._data.apparatus[i].end === gap_index - 1) {
			unit_before = CL._data.apparatus[i];
		}
		if (CL._data.apparatus[i].start === gap_index + 1) {
			unit_after = CL._data.apparatus[i];
		}
		if (typeof unit_before !== 'undefined' && typeof unit_after !== 'undefined') {
			if (unit_before.hasOwnProperty('overlap_units') && unit_after.hasOwnProperty('overlap_units')) {
				for (key in unit_before.overlap_units) {
					if (unit_before.overlap_units.hasOwnProperty(key) && unit_after.overlap_units.hasOwnProperty(key)) {
						for (j = 0; j < unit_before.overlap_units[key].length; j += 1) {
							if (overlapped_witnesses.indexOf(unit_before.overlap_units[key][j]) === -1) {
								overlapped_witnesses.push(unit_before.overlap_units[key][j]);
							}
						}
					}
				}
			}  
		}
	}
	return overlapped_witnesses;
},

/** move the unit to a new location (when dropped on the number) */
move_unit: function (rd) {
	var unit_details, unit_num, unit, target_location, original_location, error_mess, scroll_offset, temp;
	//then move the element
	scroll_offset = [document.getElementById('scroller').scrollLeft,
	                 document.getElementById('scroller').scrollTop];
	unit_details = CL.get_unit_app_reading(rd.obj.firstChild.id);
	unit_num = unit_details[0];
	unit = CL._data[unit_details[1]][unit_num];
	target_location = parseInt(rd.td.target.id.replace('num_', ''), 10);
	original_location = CL._data.apparatus[unit_num].start;
	if (target_location%2 === 1) {
		if ((unit.start === unit.end && unit.start%2 === 1 ) || typeof unit_details[2] !== 'undefined') { 
			if (unit_details[1] === 'apparatus') { //check this is a main reading not an overlapping one                  
				if (!SV.unit_at_location(target_location)) {
					if (!CL._data.apparatus[unit_num].hasOwnProperty('split_readings')) {  
						SV.do_move_whole_unit(target_location, original_location, unit_num);                
					} else {
						SV.prepare_for_operation();
						SV.add_to_undo_stack(CL._data);
						SV.do_move_single_reading(target_location, original_location, unit_num, rd);
					}
				} else {
					error_mess = 'ERROR: units and readings cannot be moved into a gap which already contains a unit';
					SV.show_set_variants_data({'message': {'type': 'error', 'message': error_mess}});
					document.getElementById('scroller').scrollLeft = scroll_offset[0];
					document.getElementById('scroller').scrollTop = scroll_offset[1];
				}
			} else {
				error_mess = 'ERROR: overlapping units cannot be moved';
				SV.show_set_variants_data({'message': {'type': 'error', 'message': error_mess}});
				document.getElementById('scroller').scrollLeft = scroll_offset[0];
				document.getElementById('scroller').scrollTop = scroll_offset[1];
			}
		} else {
			error_mess = 'ERROR: units with an \'a\' reading cannot be moved';
			SV.show_set_variants_data({'message': {'type': 'error', 'message': error_mess}});
			document.getElementById('scroller').scrollLeft = scroll_offset[0];
			document.getElementById('scroller').scrollTop = scroll_offset[1];
		}
	} else { //no need to do anything
		SV.show_set_variants_data();
		document.getElementById('scroller').scrollLeft = scroll_offset[0];
		document.getElementById('scroller').scrollTop = scroll_offset[1];
	}
},

/** check the set of witnesses in unit 1 and unit 2 are the same*/
check_witness_equality: function (unit1, unit2, app_id) {
	var i, witnesses1, witnesses2;
	witnesses1 = CL.get_active_unit_witnesses(unit1, app_id);
	witnesses2 = CL.get_active_unit_witnesses(unit2, app_id);
	if (witnesses1.length !== witnesses2.length) {
		return false;
	}
	for (i = 0; i < witnesses1.length; i += 1) {
		if (witnesses2.indexOf(witnesses1[i]) === -1) {
			return false;
		}
	}
	return true;
},

get_lowest_index: function (a, b) {
	var a_main, b_main, a_sub, b_sub;
	if (a.indexOf('.') !== -1) {
		a_main = parseInt(a.split('.')[0]);
		a_sub = parseInt(a.split('.')[1]);
	} else {
		a_main = parseInt(a);
		a_sub = 0;
	}
	if (b.indexOf('.') !== -1) {
		b_main = parseInt(b.split('.')[0]);
		b_sub = parseInt(b.split('.')[1]);
	} else {
		b_main = parseInt(b);
		b_sub = 0;
	}
	if (a_main < b_main) {
		return a;
	}
	if (a_main > b_main) {
		return b;
	}
	if (a_sub < b_sub) {
		return a;
	}
	if (a_sub > b_sub) {
		return b;
	}
	return a;
},

do_combine_units: function (units, app_id, keep_id) {
	var newunit, index, i, j, unit1, unit2, warning_mess, error_mess, problems, warning_unit, scroll_offset,
	combined_gap_before_subreadings, combined_gap_after_subreadings, combined_gap_before_subreadings_details, key,
	witness_equality, overlap_boundaries, overlap_status_agreement;
	scroll_offset = [document.getElementById('scroller').scrollLeft, 
	                 document.getElementById('scroller').scrollTop];
	//make sure unit 1 is leftmost and unit 2 is rightmost

	unit1 = CL._data[app_id][Math.min(units[0][0], units[1][0])];
	unit2 = CL._data[app_id][Math.max(units[0][0], units[1][0])];
	witness_equality = SV.check_witness_equality(unit1, unit2, app_id);
	overlap_boundaries = SV.check_overlap_boundaries(unit1, unit2, app_id);
	overlap_status_agreement = SV.check_overlap_status_agreement(unit1, unit2, app_id);
	if (witness_equality && overlap_boundaries && overlap_status_agreement) {
		if (keep_id === true) {
			//combine the reference ids in the top apparatus
			SV.combine_apparatus_ids(unit1._id, unit2._id);
		}
		combined_gap_before_subreadings = [];
		combined_gap_after_subreadings = [];
		combined_gap_before_subreadings_details = {};
		//make a list of all the combined_gap_before_subreadings witnesses in the leftmost unit
		for (i = 0; i < unit1.readings.length; i += 1) {
			if (unit1.readings[i].hasOwnProperty('combined_gap_before_subreadings')) {
				combined_gap_before_subreadings.push.apply(combined_gap_before_subreadings, unit1.readings[i].combined_gap_before_subreadings);
			}
			if (unit1.readings[i].hasOwnProperty('combined_gap_before_subreadings_details')) {
				for (key in unit1.readings[i].combined_gap_before_subreadings_details) {
					if (unit1.readings[i].combined_gap_before_subreadings_details.hasOwnProperty(key)) {
						combined_gap_before_subreadings_details[key] = unit1.readings[i].combined_gap_before_subreadings_details[key];
					}
				}
			}
		}
		//make a list of all the combined_gap_after_subreadings witnesses in the rightmost unit
		for (i = 0; i < unit2.readings.length; i += 1) {
			if (unit2.readings[i].hasOwnProperty('combined_gap_after_subreadings')) {
				combined_gap_after_subreadings.push.apply(combined_gap_after_subreadings, unit2.readings[i].combined_gap_after_subreadings);
			}
		}
		SV.add_to_undo_stack(CL._data);
		//make a new unit
		newunit = {};
		newunit.start = Math.min(unit1.start, unit2.start);
		newunit.end = Math.max(unit1.end, unit2.end);
		newunit.first_word_index = SV.get_lowest_index(unit1.first_word_index, unit2.first_word_index);

		if (unit1.hasOwnProperty('overlap_units')) { //at this point they are the same so we can just take one
			newunit.overlap_units = unit1.overlap_units;
		}
		if (app_id === 'apparatus') {
			//if the new unit starts or ends in with an addition remove the NA space from the unit
			//not for overlapping readings
			if (newunit.start !== newunit.end) {
				if (newunit.start % 2 === 1) {
					newunit.start = newunit.start + 1;
				}
				if (newunit.end % 2 === 1) {
					newunit.end = newunit.end - 1;
				}
				if (newunit.first_word_index.split('.')[0] < newunit.start) {
					newunit.first_word_index = newunit.start + '.' + 1;
				}
			}
		}
		newunit = SV.combine_readings(unit1.readings, unit2.readings, newunit, false);  
		if (keep_id === true) {
			newunit._id = unit1._id;
		} else {
			CL.add_unit_id(newunit);
		}
		CL.add_reading_ids(newunit);
		//put back any combined_gap_before_subreadings
		for (i = 0; i < combined_gap_before_subreadings.length; i += 1) {
			for (j = 0; j < newunit.readings.length; j += 1) {
				if (newunit.readings[j].witnesses.indexOf(combined_gap_before_subreadings[i]) !== -1) {
					if (newunit.readings[j].hasOwnProperty('combined_gap_before_subreadings')) {
						newunit.readings[j].combined_gap_before_subreadings.push(combined_gap_before_subreadings[i]);
					} else {
						newunit.readings[j].combined_gap_before_subreadings = [combined_gap_before_subreadings[i]];
					}
					if (combined_gap_before_subreadings_details.hasOwnProperty(combined_gap_before_subreadings[i])) {
						if (newunit.readings[j].hasOwnProperty('combined_gap_before_subreadings_details')) {
							newunit.readings[j].combined_gap_before_subreadings_details[combined_gap_before_subreadings[i]] = combined_gap_before_subreadings_details[combined_gap_before_subreadings[i]];
						} else {
							newunit.readings[j].combined_gap_before_subreadings_details = {};
							newunit.readings[j].combined_gap_before_subreadings_details[combined_gap_before_subreadings[i]] = combined_gap_before_subreadings_details[combined_gap_before_subreadings[i]];
						}
					}
				}
			}
		}
		//put back any combined_gap_after_subreadings
		for (i = 0; i < combined_gap_after_subreadings.length; i += 1) {
			for (j = 0; j < newunit.readings.length; j += 1) {
				if (newunit.readings[j].witnesses.indexOf(combined_gap_after_subreadings[i]) !== -1) {
					if (newunit.readings[j].hasOwnProperty('combined_gap_after_subreadings')) {
						newunit.readings[j].combined_gap_after_subreadings.push(combined_gap_after_subreadings[i]);
					} else {
						newunit.readings[j].combined_gap_after_subreadings = [combined_gap_after_subreadings[i]];
					}
				}
			}
		}
		//check the combined gap flags on main reading are okay
		for (i = 0; i < newunit.readings.length; i += 1) {
			SV.check_combined_gap_flags(newunit.readings[i]);
		}
		//remove old units;
		index = Math.min(units[0][0], units[1][0]);
		CL._data[app_id].splice(Math.max(units[0][0], units[1][0]), 1);
		CL._data[app_id].splice(Math.min(units[0][0], units[1][0]), 1);
		//here add this to data and then reload page
		CL._data[app_id].splice(index, 0, newunit);
		SV.separate_overlap_witnesses(index);
		if (newunit.start === newunit.end) {
			SV.reindex_unit(newunit.start);
		} else {
			SV.check_and_fix_index_order(newunit.start);
		}
		//in here split out 'a' reading if we are dealing with overlapping units
		//and always separate is as a different reading even when other readings agree
		if (app_id !== 'apparatus') {
			//find the reading with the base text witness
			for (i = 0; i < CL._data[app_id][index].readings.length; i += 1) {
				if (CL._data[app_id][index].readings[i].witnesses.indexOf(CL._data_settings.base_text_siglum) !== -1) {
					//split it out
					SV.do_split_reading_witnesses(index, i, [CL._data_settings.base_text_siglum], app_id, false);
					CL.sort_readings(CL._data[app_id][index].readings);
					break;
				}
			}
		}
		SV.unprepare_for_operation();
		SV.unsplit_unit_witnesses(index, 'apparatus'); //just in case
		if (app_id !== 'apparatus') {
			//then check that all witness words in the unit are only 2 apart
			problems = SV.check_unit_integrity(app_id, index);
			if (problems.length > 0) {
				warning_mess = 'WARNING: The following witnesses have words missing in the highlighted unit: ' + problems.join(', ');
				warning_unit = [app_id, index];
			}
		} 
		SV.check_bug_status('combine', app_id + ' unit ' + Math.min(units[0][0], units[1][0]) + ' with unit ' + Math.max(units[0][0], units[1][0]) + '.');
		if (warning_mess !== undefined) {
			SV.show_set_variants_data({'message': {'type': 'warning', 'message': warning_mess}, 'highlighted_unit': warning_unit});
		} else {
			SV.show_set_variants_data({});
		}
	} else {
		//redraw without making any changes and error messages
		if (witness_equality === false) {
			error_mess = 'ERROR: units with different witness sets cannot be combined';
		} else if (overlap_boundaries === false) {
			error_mess = 'ERROR: units cannot be combined across overlapping unit boundaries';
		} else if (overlap_status_agreement === false) {
			error_mess = 'ERROR: These units cannot be combined as some of the witnesses have different statuses (deleted, overlapped etc.)';
		}
		SV.unprepare_for_operation();
		SV.show_set_variants_data({'message': {'type': 'error', 'message': error_mess}});
	}
	document.getElementById('scroller').scrollLeft = scroll_offset[0];
	document.getElementById('scroller').scrollTop = scroll_offset[1];
},

//all_gaps is true when one of the units contains only gaps
check_overlap_boundaries: function (unit1, unit2, app_id, all_gaps) {
	var unit1_ids, unit2_ids;
	if (app_id !== 'apparatus') {
		return true;
	}
	if (!unit1.hasOwnProperty('overlap_units') && !unit2.hasOwnProperty('overlap_units')) {
		return true;
	} 
	if (all_gaps === true) {
		if (!CL.unit_has_text(unit1) && !unit1.hasOwnProperty('overlap_units')) {
			return true;
		}
		if (!CL.unit_has_text(unit2) && !unit2.hasOwnProperty('overlap_units')) {
			return true;
		}
	}
	if (unit1.hasOwnProperty('overlap_units') && unit2.hasOwnProperty('overlap_units')) {
		unit1_ids = SV.get_object_keys(unit1.overlap_units);
		unit2_ids = SV.get_object_keys(unit2.overlap_units);
		if (unit1_ids.length === unit2_ids.length) {
			if (JSON.stringify(unit1_ids) === JSON.stringify(unit2_ids)) {
				return true;
			}
		}
	}
	return false;
},

check_special_overlap_status_agreement: function (text_unit, empty_unit) {
	var witnesses, key, i, j;
	witnesses = [];
	for (key in text_unit.overlap_units) {
		if (text_unit.overlap_units.hasOwnProperty(key)) {
			witnesses.push.apply(witnesses, text_unit.overlap_units[key]);
		}
	}
	for (i = 0; i < empty_unit.readings.length; i += 1) {
		if (empty_unit.readings[i].hasOwnProperty('type') && empty_unit.readings[i].type === 'om') {
			for (j = 0; j < empty_unit.readings[i].witnesses.length; j += 1) {
				if (witnesses.indexOf(empty_unit.readings[i].witnesses[j]) !== -1) {
					witnesses.splice(witnesses.indexOf(empty_unit.readings[i].witnesses[j]), 1);
				}
			}
		}
	}
	if (witnesses.length === 0) {
		return true;
	}
	return false;
},

//all_gaps is true when one of the units contains only gaps
check_overlap_status_agreement: function (unit1, unit2, app_id, all_gaps) {
	var i, special_witnesses1, special_witnesses2, keys1, keys2, agreement;
	if (app_id !== 'apparatus') {
		return true;
	}
	if (all_gaps === true) {
		if (!CL.unit_has_text(unit1) && !unit1.hasOwnProperty('overlap_units') && unit2.hasOwnProperty('overlap_units')) {
			return SV.check_special_overlap_status_agreement(unit2, unit1);
		}
		if (!CL.unit_has_text(unit2) && !unit2.hasOwnProperty('overlap_units') && unit1.hasOwnProperty('overlap_units')) {
			return SV.check_special_overlap_status_agreement(unit1, unit2);
		}
	}
	special_witnesses1 = {};
	for (i = 0; i < unit1.readings.length; i += 1) {
		if (unit1.readings[i].hasOwnProperty('overlap_status')) {
			if (!special_witnesses1.hasOwnProperty(unit1.readings[i].overlap_status)) {
				special_witnesses1[unit1.readings[i].overlap_status] = [];
			}
			special_witnesses1[unit1.readings[i].overlap_status].push.apply(special_witnesses1[unit1.readings[i].overlap_status], unit1.readings[i].witnesses);
		}
	}
	special_witnesses2 = {};
	for (i = 0; i < unit2.readings.length; i += 1) {
		if (unit2.readings[i].hasOwnProperty('overlap_status')) {
			if (!special_witnesses2.hasOwnProperty(unit2.readings[i].overlap_status)) {
				special_witnesses2[unit2.readings[i].overlap_status] = [];
			}
			special_witnesses2[unit2.readings[i].overlap_status].push.apply(special_witnesses2[unit2.readings[i].overlap_status], unit2.readings[i].witnesses);
		}
	}
	keys1 = SV.get_object_keys(special_witnesses1);
	keys2 = SV.get_object_keys(special_witnesses2);
	if (keys1.length === keys2.length) {
		if (JSON.stringify(keys1) === JSON.stringify(keys2)) {
			agreement = true;
			for (i = 0; i < keys1.length; i += 1) {
				if (JSON.stringify(special_witnesses1[keys1[i]].sort) !== JSON.stringify(special_witnesses2[keys2[i]].sort)) {
					agreement = false;
				}
			}
			return agreement
		}
	}
	return false;
},

get_object_keys: function (obj) {
	var key, keys;
	keys = [];
	for (key in obj) {
		if (obj.hasOwnProperty(key)) {
			keys.push(key);
		}
	}
	return keys.sort();
},

get_gap_details: function (previous_unit, hit_witnesses) {
	var i, gap_details;
	if (typeof previous_unit !== 'undefined') {
		for (i = 0; i < previous_unit.readings.length; i += 1) {
			//at this point all the witnesses definitely read the same so just check one witness
			if (previous_unit.readings[i].witnesses.indexOf(hit_witnesses[0]) !== -1) {
				console.log(previous_unit.readings[i].text);
				gap_details = previous_unit.readings[i].text[previous_unit.readings[i].text.length-1][hit_witnesses[0]].gap_details;
				return gap_details;
			}
		}
	}
	return null;
},

/** Given a reading (from a unit) and a witness
 * return true if witness is a subreading 
 * false if witness is not in the reading or is a main reading */
is_subreading: function (reading, witness) {
	var i;
	if (reading.witnesses.indexOf(witness) === -1) {
		return false;
	}
	for (i = 0; i < reading.text.length; i += 1) {
		if (reading.text[i].hasOwnProperty(witness) 
				&& reading.text[i][witness].hasOwnProperty('decision_class') 
				&& reading.text[i][witness]['decision_class'].length > 0) {
			return true;
		}
	}
	return false;
},

/** returns true is list1 is subset of list 2
 * false if not */
is_subset_of: function (list1, list2) {
	var i;
	for (i = 0; i < list1.length; i += 1) {
		if (list2.indexOf(list1[i]) === -1) {
			return false;
		}
	}
	return true;
},

special_combine_readings: function (empty_unit, text_unit, text_unit_pos, gap_position, app_id, adjacent_unit) {
	var target_witnesses, adjacent_witnesses, hit_witnesses, readings_to_add, i, j, k, new_reading_id, reading, gap_details, hit_witnesses_copy, subreadings;
	target_witnesses = [];
	adjacent_witnesses = [];
	readings_to_add = [];
	//find the witnesses might be interested in (any type lacs which are not lac verse) from special gap unit
	for (i = 0; i < empty_unit.readings.length; i += 1) {
		if (empty_unit.readings[i].type === 'lac') {
			target_witnesses.push.apply(target_witnesses, empty_unit.readings[i].witnesses);
		}
	}
	if (typeof adjacent_unit !== 'undefined') {
		//Now get all the witness which are lac in the adjacent unit (this will either be the unit before or after the gap depending on direction of merge)
		//because they will not need gaps combining
		for (i = 0; i < adjacent_unit.readings.length; i += 1) {
			if (adjacent_unit.readings[i].type === 'lac') {
				adjacent_witnesses.push.apply(adjacent_witnesses, adjacent_unit.readings[i].witnesses);
			}
		}        	
	}
	//now loop through the witnesses we might be interested in and remove any that have gaps in the adjacent unit
	//go backwards so you can splice
	for (i = target_witnesses.length-1; i >= 0; i -= 1) {
		if (adjacent_witnesses.indexOf(target_witnesses[i]) !== -1) {
			target_witnesses.splice(i, 1);
		}
	}
	//add special attribute to the readings of any remaining witnesses making new readings if necessary
	for (i = 0; i < text_unit.readings.length; i += 1) {
		hit_witnesses = [];
		for (j = 0; j < text_unit.readings[i].witnesses.length; j += 1) {     	    
			if (target_witnesses.indexOf(text_unit.readings[i].witnesses[j]) != -1) {
				hit_witnesses.push(text_unit.readings[i].witnesses[j]);
			}        	    
		}
		if (text_unit.readings[i].text.length > 0  
				&& SV.is_subset_of(text_unit.readings[i].witnesses, hit_witnesses)) { //if the reading witnesses are a subset of hit_witnesses
			//we are dealing with all witnesses in the reading
			if (gap_position === 'before') {
				if (text_unit.readings[i].text.length > 0) {
					text_unit.readings[i].text[0].combined_gap_before = text_unit.readings[i].witnesses;
					if (text_unit.readings[i].text[0][hit_witnesses[0]].hasOwnProperty('gap_before_details')) {
						text_unit.readings[i].text[0].combined_gap_before_details = text_unit.readings[i].text[0][hit_witnesses[0]].gap_before_details;
					}
					if (typeof adjacent_unit !== 'undefined') {
						gap_details = SV.get_gap_details(adjacent_unit, hit_witnesses);
						if (gap_details !== null) {
							text_unit.readings[i].text[0].combined_gap_before_details = gap_details;
						}
					}
				}
			} else {
				//gap is after
				text_unit.readings[i].text[text_unit.readings[i].text.length-1].combined_gap_after = text_unit.readings[i].witnesses;
			}
		} else if (text_unit.readings[i].text.length > 0 && hit_witnesses.length > 0) {
			//we are only dealing with only some witnesses in the reading
			for (j = 0; j < hit_witnesses.length; j += 1) { 
				//we need to remember these and add it later (when we are not looping through the readings)
				readings_to_add.push([text_unit_pos, i, [hit_witnesses[j]], app_id]);
			} 
		} 
	}
	for (i = readings_to_add.length - 1; i >= 0; i -= 1) { //go backwards so you don't screw up positions by adding readings
		new_reading_id = SV.do_split_reading_witnesses(readings_to_add[i][0], readings_to_add[i][1], readings_to_add[i][2], readings_to_add[i][3], false);
		reading = CL.find_reading_by_id(CL._data[app_id][text_unit_pos], new_reading_id);
		if (gap_position === 'before') {
			reading.text[0].combined_gap_before = readings_to_add[i][2];
			if (reading.text[0][readings_to_add[i][2][0]].hasOwnProperty('gap_before_details')) {
				reading.text[0].combined_gap_before_details = reading.text[0][readings_to_add[i][2][0]].gap_before_details;
			}
			if (typeof adjacent_unit !== 'undefined') {
				gap_details = SV.get_gap_details(adjacent_unit, readings_to_add[i][2]);
				if (gap_details !== null) {
					reading.text[0].combined_gap_before_details = gap_details;
				}
			}
		} else {
			reading.text[reading.text.length-1].combined_gap_after = readings_to_add[i][2];
		} 
	}
	CL.add_unit_id(text_unit);
	CL.add_reading_ids(text_unit);
},

do_special_combine_units: function (units, app_id) {
	var scroll_offset, unit1, unit2, unit1_pos, unit2_pos, previous_unit, next_unit,
	witness_equality, overlap_boundaries, overlap_status_agreement, error_mess;
	scroll_offset = [document.getElementById('scroller').scrollLeft, 
	                 document.getElementById('scroller').scrollTop];
	SV.add_to_undo_stack(CL._data);
	//make sure unit 1 is leftmost and unit 2 is rightmost
	unit1_pos = Math.min(units[0][0], units[1][0]);
	unit2_pos = Math.max(units[0][0], units[1][0]);
	unit1 = CL._data[app_id][unit1_pos];
	unit2 = CL._data[app_id][unit2_pos];
	witness_equality = SV.check_witness_equality(unit1, unit2, app_id);
	overlap_boundaries = SV.check_overlap_boundaries(unit1, unit2, app_id, true);
	overlap_status_agreement = SV.check_overlap_status_agreement(unit1, unit2, app_id, true);
	if (witness_equality) {// && overlap_boundaries) { //&& overlap_status_agreement) {
		if (!CL.unit_has_text(unit1)) {
			//we need the unit before to get data from it
			if (unit1_pos !== 0) {
				SV.special_combine_readings(unit1, unit2, unit2_pos, 'before', app_id, CL._data[app_id][unit1_pos-1]);
			} else {
				SV.special_combine_readings(unit1, unit2, unit2_pos, 'before', app_id);
			}	
		}
		if (!CL.unit_has_text(unit2)) {
			//we need the unit after to get data from it
			if (unit2_pos+1 < CL._data[app_id].length) {
				SV.special_combine_readings(unit2, unit1, unit1_pos, 'after', app_id, CL._data[app_id][unit2_pos+1]);
			} else {
				SV.special_combine_readings(unit2, unit1, unit1_pos, 'after', app_id);
			}
		}

		SV.unprepare_for_operation();

		if (app_id !== 'apparatus') {
			//then check that all witness words in the unit are only 2 apart
			problems = SV.check_unit_integrity(app_id, index);
			if (problems.length > 0) {
				warning_mess = 'WARNING: The following witnesses have words missing in the highlighted unit: ' + problems.join(', ');
				warning_unit = [app_id, index];
			}
		} 
		SV.check_bug_status('special combine', app_id + ' unit ' + Math.min(units[0][0], units[1][0]) + ' with unit ' + Math.max(units[0][0], units[1][0]) + '.');  
		SV.show_set_variants_data({});
	} else {
		//redraw without making any changes and error messages
		if (witness_equality === false) {
			error_mess = 'ERROR: units with different witness sets cannot be combined';
		} else if (overlap_boundaries === false) {
			error_mess = 'ERROR: units cannot be combined across overlapping unit boundaries';
		} else if (overlap_status_agreement === false) {
			error_mess = 'ERROR: These units cannot be combined as some of the witnesses have different statuses (deleted, overlapped etc.)';
		}
		SV.unprepare_for_operation();
		SV.show_set_variants_data({'message': {'type': 'error', 'message': error_mess}});
	}
	document.getElementById('scroller').scrollLeft = scroll_offset[0];
	document.getElementById('scroller').scrollTop = scroll_offset[1];
},

/** combine two units */
//TODO: come up with a way of testing adjacency with overlapping rows
combine_units: function (units, rd) {
	var unit1, unit2, scroll_offset, added, real_readings, app_id, error_mess;
	scroll_offset = [document.getElementById('scroller').scrollLeft, 
	                 document.getElementById('scroller').scrollTop];
	SV.prepare_for_operation();
	//at this point both units are from same apparatus
	app_id = units[0][1];
	if (app_id === 'apparatus') {
		if (Math.max(units[0][0], units[1][0]) - Math.min(units[0][0], units[1][0]) === 1) {
			//the units are adjacent
			if ((CL._data[app_id][units[0][0]].hasOwnProperty('created') && !CL.unit_has_text(CL._data[app_id][units[0][0]])) 
					|| (CL._data[app_id][units[1][0]].hasOwnProperty('created') && !CL.unit_has_text(CL._data[app_id][units[1][0]]))) {
				SV.do_special_combine_units(units, app_id);
			} else {
				SV.do_combine_units(units, app_id);
			}               
		} else {
			//redraw without making any changes
			error_mess = 'ERROR: non-adjacent units cannot be combined';
			SV.unprepare_for_operation();
			SV.show_set_variants_data({'message': {'type': 'error', 'message': error_mess}});
		}
	} else {               
		//make sure unit 1 is leftmost and unit 2 is rightmost
		unit1 = CL._data[app_id][Math.min(units[0][0], units[1][0])];
		unit2 = CL._data[app_id][Math.max(units[0][0], units[1][0])];
		//at the same time change the overlap unit id of the second one to match the first
		if (SV.are_adjacent(unit1._id, unit2._id)) {                
			SV.do_combine_units(units, app_id, true);               	
		} else {
			//redraw without making any changes
			error_mess = 'ERROR: non-adjacent units cannot be combined';
			SV.unprepare_for_operation();
			SV.show_set_variants_data({'message': {'type': 'error', 'message': error_mess}});
		}
	}
	document.getElementById('scroller').scrollLeft = scroll_offset[0];
	document.getElementById('scroller').scrollTop = scroll_offset[1];
},

combine_apparatus_ids: function (unit1_id, unit2_id) {
	var i, top_line, unit_positions, wit_details;
	top_line = CL._data.apparatus;
	unit_positions = SV._find_apparatus_positions_by_overlap_id(unit1_id, unit2_id);
	wit_details = top_line[unit_positions[0]].overlap_units[unit1_id];
	for (i = unit_positions[1]; i < top_line.length; i += 1) {
		if (top_line[i].hasOwnProperty('overlap_units') && top_line[i].overlap_units.hasOwnProperty(unit2_id)) {
			delete top_line[i].overlap_units[unit2_id];
			top_line[i].overlap_units[unit1_id] = wit_details;
		}
	}
},

_find_apparatus_positions_by_overlap_id: function (unit1_id, unit2_id) {
	var i, top_line, last1, first2;
	top_line = CL._data.apparatus;
	for (i = 0; i < top_line.length; i += 1) {
		if (top_line[i].hasOwnProperty('overlap_units')) {
			if (top_line[i].overlap_units.hasOwnProperty(unit1_id)) {
				last1 = i;
			}
			if (top_line[i].overlap_units.hasOwnProperty(unit2_id) && typeof first2 === 'undefined') {
				first2 = i;
			}
		}
	}
	return [last1, first2];
},

are_adjacent: function (unit1_id, unit2_id) {
	var unit_positions;
	unit_positions = SV._find_apparatus_positions_by_overlap_id(unit1_id, unit2_id);
	if (typeof unit_positions[0] !== 'undefined' && typeof unit_positions[1] !== 'undefined') {
		if (unit_positions[0] + 1 === unit_positions[1]) {        	    
			return true;
		}
	}
	return false;        
},

has_unit: function(index) {
	var i;
	for (i = 0; i < CL._data.apparatus.length; i += 1) {
		if (CL._data.apparatus[i].start === index && CL._data.apparatus[i].end === index) {
			return true;
		}
	}
	return false;
},

/** move a reading to a new unit which already has readings in it */
move_reading: function (units, rd) {
	var i, app_id, unit1, unit2, unit2_reading_letters, unit2_reading_pos, problems, warning_mess,
	reading, added, newunit, real_readings, scroll_offset, target_location, original_location,
	witnesses, new_om_reading, key, do_move_out, do_move_in, replacement_readings;
	scroll_offset = [document.getElementById('scroller').scrollLeft, 
	                 document.getElementById('scroller').scrollTop];
	SV.prepare_for_operation();
	//at this point both units are from same apparatus
	app_id = units[0][1];

	//first in merge list is always the target, second is always the one you moved
	//so you are moving the second one and taking position from first
	unit1 = CL._data[app_id][units[0][0]];
	unit2 = CL._data[app_id][units[1][0]];
	unit2_reading_pos = units[1][2];
	//get the reading you've moved (as a list for later merging)
	reading = [unit2.readings[unit2_reading_pos]];
	witnesses = reading[0].witnesses.join(',');
	if (!reading[0].hasOwnProperty('overlap_status') || reading[0].overlap_status === 'duplicate') {
		do_move_out = true;
		//if any of these witnesses are in the list of overlapped readings
		// if the unit you are moving it into is part of the same overlapped reading
		if (unit2.hasOwnProperty('overlap_units')) {
			for (key in unit2.overlap_units) {
				if (unit2.overlap_units.hasOwnProperty(key) && do_move_out === true) {
					for (i = 0; i < reading[0].witnesses.length; i += 1) {
						if (unit2.overlap_units[key].indexOf(reading[0].witnesses[i]) !== -1) {
							if (!unit1.hasOwnProperty('overlap_units') 
									|| (unit1.hasOwnProperty('overlap_units') 
											&& !unit1.overlap_units.hasOwnProperty(key))) {
								do_move_out = false;
								break;
							}
						}
					}
				}
			}
		}
		do_move_in = true;
		if (unit1.hasOwnProperty('overlap_units')) {
			for (key in unit1.overlap_units) {
				if (unit1.overlap_units.hasOwnProperty(key) && do_move_in === true) {
					for (i = 0; i < reading[0].witnesses.length; i += 1) {
						if (unit1.overlap_units[key].indexOf(reading[0].witnesses[i]) !== -1) {
							if (!unit2.hasOwnProperty('overlap_units') 
									|| (unit2.hasOwnProperty('overlap_units') 
											&& !unit2.overlap_units.hasOwnProperty(key))) {
								do_move_in = false;
								break;
							}
						}
					}
				}
			}
		}
		//remove overlap flags where necessary check equivalence etc and work out hierarchy, nothing, duplicated, overlapped, deleted
		if (do_move_out === true && do_move_in === true) {
			SV.add_to_undo_stack(CL._data);
			//delete any combined gap details on subreadings
			delete reading[0].combined_gap_before_subreadings;
			delete reading[0].combined_gap_before_subreadings_details;
			delete reading[0].combined_gap_after_subreadings;          
			//and remove its index numbers so it doesn't influence later reindexing
			//and any combined gap details
			for (i = 0; i < reading[0].text.length; i += 1) {
				delete reading[0].text[i].index;
				delete reading[0].text[i].combined_gap_before;
				delete reading[0].text[i].combined_gap_after;
			}

			//remove reading from its original unit
			unit2.readings.splice(unit2_reading_pos, 1);
			//replace it with an om reading or two depending on overlap status
			replacement_readings = SV.get_replacement_om_reading(unit2, reading[0]);
			for (i = 0; i < replacement_readings.length; i += 1) {
				CL.add_reading_id(replacement_readings[i], unit2.start, unit2.end);
				unit2.readings.push(replacement_readings[i]);
			}

			SV.unsplit_unit_witnesses(units[1][0], app_id);
			//merge reading into target unit 
			unit1 = SV.combine_readings(unit1.readings, reading, unit1, true);

			if (unit1.start === unit1.end) {
				SV.reindex_unit(unit1.start);
			} else {
				SV.reindex_moved_reading(unit1.start, reading[0].witnesses);
			}
			SV.separate_overlap_witnesses(units[0][0]);
			problems = SV.check_word_order_integrity(unit2.start, unit1.start, reading[0].witnesses);
			CL.add_reading_ids(unit1);
			//now see if the remaining unit has any text left and if not check to see if it has overlapping readings
			//if it doesn't have overlapping readings we can delete it. 
			//if it does its safer to leave it here for the editor to decide what to do.
			if (!CL.unit_has_text(CL._data[app_id][units[1][0]])) {
				if (!unit2.hasOwnProperty('overlap_units')) {
					CL._data[app_id][units[1][0]] = null;
				}
			}
			CL._data.apparatus = CL.remove_null_items(CL._data[app_id]);
			//I added this for tidyness' sake in response to a bug logged by David, In the end I decided to fix it in a different way by allowing 
			//any units left with no readings to be combined with neighbouring ones by only using special combine units
			//when dealing with a unit I specifically say is created I think that it will be a 'safer' solution. But I like this logic so leaving here for now in case it is useful
			//now if unit2 has no readings think about geting rid of it
//			if (!CL.unit_has_text(CL._data[app_id][units[1][0]])) {
//			//only get rid of it if 1) it is not the only example of a unit with any of its overlap ids 2) its overlap units do not have text (are om/lac)
//			if (unit2.hasOwnProperty('overlap_units')) {
//			if (SV.neighbours_share_all_overlaps(app_id, units[1][0]) && CL.overlap_has_empty_reading(unit2.overlap_units)) {
//			CL._data[app_id][units[1][0]] = null;
//			}
//			}        		
//			}
//			CL._data.apparatus = CL.remove_null_items(CL._data[app_id]);
			SV.unprepare_for_operation();            
			SV.check_bug_status('move reading', unit2_reading_pos + ' with witnesses ' + witnesses + ' from unit ' + units[1][0] + ' to unit ' + units[0][0] + ' in ' + app_id + '.');           
			if (problems.length > 0) {
				warning_mess = 'WARNING: Moving the reading has created word order problems in following witnesses: ' + problems.join(', ');
				SV.show_set_variants_data({'message': {'type': 'warning', 'message': warning_mess}});
			} else {
				SV.show_set_variants_data({});
			} 
			document.getElementById('scroller').scrollLeft = scroll_offset[0];
			document.getElementById('scroller').scrollTop = scroll_offset[1];
		} else if (do_move_out === false) {
			SV.unprepare_for_operation();
			warning_mess = 'ERROR: Readings which have been overlapped cannot be relocated outside the scope of the overlapped unit';
			SV.show_set_variants_data({'message': {'type': 'error', 'message': warning_mess}});
			document.getElementById('scroller').scrollLeft = scroll_offset[0];
			document.getElementById('scroller').scrollTop = scroll_offset[1];
		} else if (do_move_in === false) {
			SV.unprepare_for_operation();
			warning_mess = 'ERROR: Readings cannot be relocated to units in which any of the witnesses to the reading being moved have been overlapped';
			SV.show_set_variants_data({'message': {'type': 'error', 'message': warning_mess}});
			document.getElementById('scroller').scrollLeft = scroll_offset[0];
			document.getElementById('scroller').scrollTop = scroll_offset[1];
		}
	} else {
		SV.unprepare_for_operation();
		warning_mess = 'ERROR: Deleted and overlapped readings cannot be relocated (they can be overwritten)';
		SV.show_set_variants_data({'message': {'type': 'error', 'message': warning_mess}});
		document.getElementById('scroller').scrollLeft = scroll_offset[0];
		document.getElementById('scroller').scrollTop = scroll_offset[1];
	}
},

//checks to see if each overlapped unit in the current unit is shared by at least one neighbour
neighbours_share_all_overlaps: function (app_id, unit_pos) {
	var i, ol_ids, next_ol_ids, previous_ol_ids;
	ol_ids = SV.get_overlapped_ids(CL._data[app_id][unit_pos]);
	if (unit_pos + 1 < CL._data[app_id].length) {
		next_ol_ids = SV.get_overlapped_ids(CL._data[app_id][unit_pos+1]);
	} else {
		next_ol_ids = [];
	}
	if (unit_pos !== 0) {
		previous_ol_ids = SV.get_overlapped_ids(CL._data[app_id][unit_pos-1]);
	} else {
		previous_ol_ids = [];
	}
	for (i = 0; i < ol_ids.length; i += 1) {
		if (next_ol_ids.indexOf(ol_ids[i]) === -1 && previous_ol_ids.indexOf(ol_ids[i]) === -1) {
			return false;
		}
	}
	return true;
},

get_overlapped_ids: function (top_unit) {
	var ids, key;
	ids = [];
	if (top_unit.hasOwnProperty('overlap_units')) {
		for (key in top_unit.overlap_units) {
			if (top_unit.overlap_units.hasOwnProperty(key)) {
				ids.push(key);
			}
		}
	}
	return ids;
},

//this will return a list of readings (because we might need to split into overlapped and not overlapped
get_replacement_om_reading: function (unit, moved_reading) {
	var key, i, witnesses, ol_witnesses;
	if (moved_reading.hasOwnProperty('overlap_status')) {
		//then all witnesses are implicated and we can just return a single om reading with duplicate status
		return [{'text' : [], 'type' : 'om', 'witnesses' : moved_reading.witnesses.slice(0), 'overlap_status' : 'duplicate'}];
	}
	//otherwise this reading might have been made a main reading and combined with other readings
	//so we need to check and split out any overlapped witnesses returning 2 om readings
	//or we could just return a single om reading with no overlap status if no witneses are overlapped
	ol_witnesses = []; 
	if (unit.hasOwnProperty('overlap_units')) {
		for (key in unit.overlap_units) {
			if (unit.overlap_units.hasOwnProperty(key)) {
				for (i = 0; i < unit.overlap_units[key].length; i += 1) {
					if (moved_reading.witnesses.indexOf(unit.overlap_units[key][i]) !== -1) {
						ol_witnesses.push(unit.overlap_units[key][i]);
					}
				}
			}
		}
	}
	if (ol_witnesses.length === 0) {
		//then none of this readings witnesses are overlapped so return an om reading
		return [{'text' : [], 'type' : 'om', 'witnesses' : moved_reading.witnesses.slice(0)}];
	}
	if (ol_witnesses.length === moved_reading.witnesses.length) {
		//then they are all overlapped so return a single overlapped om reading
		return [{'text' : [], 'type' : 'om', 'witnesses' : moved_reading.witnesses.slice(0), 'overlap_status' : 'duplicate'}];
	}
	//otherwise we need to split them
	witnesses = moved_reading.witnesses.slice(0);
	for (i = 0; i < ol_witnesses.length; i += 1) {
		if (witnesses.indexOf(ol_witnesses[i]) !== -1) {
			witnesses.splice(witnesses.indexOf(ol_witnesses[i]), 1);
		}
	}
	return [{'text' : [], 'type' : 'om', 'witnesses' : witnesses}, {'text' : [], 'type' : 'om', 'witnesses' : ol_witnesses, 'overlap_status' : 'duplicate'}];            
},


//keep combined_gap_before_subreadings
/** used when moving readings and combining units to figure out all the reading combinations */
combine_readings: function (readings1, readings2, newunit, move_reading) {
	var i, j, k, read1, read2, newreadings, reading_string, witness, reading_text_list, key,
	reading_text, index, current, text, new_rdg;
	newreadings = {};
	//this section builds a dictionary with reading index numbers (for empty readings) or the text with indication of overlapstatus for extant readings
	//as key to witnesses and text. empty reading keys are 1-2 meaning first reading in unit1 and second reading in unit2
	//for each reading in readings 1
	for (i = 0; i < readings1.length; i += 1) {
		//for each witness in reading
		for (j = 0; j < readings1[i].witnesses.length; j += 1) {
			witness = readings1[i].witnesses[j];
			read1 = i;
			for (k = 0; k < readings2.length; k += 1) {
				if (CL.in_list(readings2[k].witnesses, witness)) {
					read2 = k;
				} else if (move_reading === true) {
					//readings 2 could be a single reading from another unit and not have a reading for all witnesses
					read2 = 'None';
				}
			}
			//need to make a fake new reading in order to extract the text
			new_rdg = {'text': SV.order_unit_text(readings1, readings2, [read1, read2], witness)}; 
			text = CL.extract_witness_text(new_rdg, {'witness': witness, 'reading_type': 'mainreading'});                    
			if (readings1[read1].hasOwnProperty('overlap_status')) {
				text = text + '_' + readings1[read1].overlap_status;
			}
			if (read2 !== 'None' && readings2[read2].hasOwnProperty('overlap_status')) {
				text = text + '_' + readings2[read2].overlap_status;
			}
			//now if we don't have any text which is possible use the reading positions in each unit as key (keeps all our different om/lac etc. reading separate)
			if (text.length === 0) {
				if (move_reading === true && read2 === 'None') {
					text = read1;
				} else {
					text = read1 + '-' + read2;
				}
			}
			if (newreadings.hasOwnProperty(text)) {
				SV.add_type_and_details(newreadings[text], readings1[read1], readings2[read2]);
				newreadings[text].witnesses.push(witness);
				newreadings[text].text = SV.combine_reading_text(readings1, readings2, [read1, read2], witness, newreadings[text].text).sort(CL.compare_indexes);
			} else {
				new_rdg = {
						'witnesses' : [witness],
						'text' : SV.combine_reading_text(readings1, readings2,  [read1, read2], witness, [])
				};
				if (read2 !== 'None') { //we only need to worry about which one to chose if we have two readings
					if (readings1[read1].hasOwnProperty('overlap_status') && readings2[read2].hasOwnProperty('overlap_status')) {
						if (readings1[read1].overlap_status === readings2[read2].overlap_status) {
							new_rdg.overlap_status = readings1[read1].overlap_status;
						} else if (readings1[read1].overlap_status === 'duplicate' || readings2[read2].overlap_status === 'duplicate') {
							new_rdg.overlap_status = 'duplicate';
						} else {
							for (k = 0; k < CL._overlapped_options.length; k += 1) {
								if (CL._overlapped_options[k].reading_flag === readings1[read1].overlap_status || CL._overlapped_options[k].reading_flag === readings2[read2].overlap_status) {
									new_rdg.overlap_status = CL._overlapped_options[k].reading_flag;
								}
							}
						}                		
					} else if (readings1[read1].hasOwnProperty('overlap_status') || readings2[read2].hasOwnProperty('overlap_status')) {
						new_rdg.overlap_status = 'duplicate'; //make it duplicate because its the safest.
					}
				} else if (readings1[read1].hasOwnProperty('overlap_status')) { //otherwise we just use readings1 overlap status if there is one
					new_rdg.overlap_status = readings1[read1].overlap_status;
				}
				newreadings[text] = new_rdg;                      
				SV.add_type_and_details(newreadings[text], readings1[read1], readings2[read2]);
			}
		}
	}
	newunit.readings = [];
	for (key in newreadings) {
		if (newreadings.hasOwnProperty(key)) {
			newunit.readings.push(SV.fix_index_numbers(newreadings[key]));
		}
	}
	return newunit;
},

fix_index_numbers: function (reading) {
	var i;
	for (i = 1; i < reading.text.length; i += 1) {
		if (typeof reading.text[i].index !== 'undefined') {
			if (reading.text[i-1].index === reading.text[i].index) {
				reading.text[i].index = SV.increment_sub_index(reading.text[i].index, 1);
			}
		}
	}
	return reading;
},

order_unit_text: function (readings1, readings2, pattern, witness, change_indexes) {
	var i, words, indexes, ordered;
	words = [];
	for (i = 0; i < pattern.length; i += 1) {
		if (i === 0) {
			if (pattern[i] !== 'None') {
				words.push.apply(words, readings1[pattern[i]].text);
			}
		} else {
			if (pattern[i] !== 'None') {
				words.push.apply(words, readings2[pattern[i]].text);
			}
		}
	}
	//sort the words for the witness
	words.sort(function (a, b) {if (a.hasOwnProperty(witness) && b.hasOwnProperty(witness)) { return parseInt(a[witness].index) - parseInt(b[witness].index)}});
	if (change_indexes === true) {
		indexes = [];
		ordered = true;
		for (i = 0; i < words.length; i += 1) {
			if (SV.less_than(words[i].index, indexes[indexes.length - 1])) {
				ordered = false;
			}
			indexes.push(words[i].index);
		}
		if (ordered === false) {
			indexes.sort(CL.compare_index_strings);
			for (i = 0; i < words.length; i += 1) {
				words[i].index = indexes[i];
			}
		}
	}
	return words;
},

//TODO: tidy up
/**  */
combine_reading_text: function (readings1, readings2, pattern, witness, current_text) {
	var i, j, k, current, words;
	if (typeof current_text === 'undefined') {
		return [];
	}
	words = SV.order_unit_text(readings1, readings2, pattern, witness, true);
	k = 0;
	for (j = 0; j < words.length; j += 1) {
		current = current_text[k] || {};
		current_text[k] = SV.combine_words(current, words[j], witness);
		if (k > 0 && current_text[k].hasOwnProperty('combined_gap_before')) {
			//if this gap is now embedded delete its reference 
			delete current_text[k]['combined_gap_before'];
			delete current_text[k]['combined_gap_before_details'];
		}
		k += 1;
	}
	for (i = 0; i < current_text.length-1; i += 1) {
		if (current_text[i].hasOwnProperty('combined_gap_after')) {
			delete current_text[i].combined_gap_after;
		}
	}
	return current_text;
},


/** add type and detail data for empty (lac/om) readings */
add_type_and_details: function (newreading, reading1, reading2) {
	var type1, type2;
	//I think lac should trump om should that ever occur (which it shouldn't)
	//if both are the same type them details come from reading1 they should also be the same anyway
	if (typeof reading2 === 'undefined') {
		if (reading1.text.length === 0) {
			newreading.type = reading1.type;
			if (reading1.hasOwnProperty('details')) {
				newreading.details = reading1.details;
			}
		}
	} else if (reading1.text.length === 0 && reading2.text.length === 0) {
		type1 = reading1.type;
		type2 = reading2.type;
		if (type1 === type2) {
			newreading.type = type1;
			if (reading1.hasOwnProperty('details')) {
				newreading.details = reading1.details;
			}
		} else if (type1 === 'lac') {
			newreading.type = type1;
			if (reading1.hasOwnProperty('details')) {
				newreading.details = reading1.details;
			}
		} else {
			newreading.type = type2;
			if (reading2.hasOwnProperty('details')) {
				newreading.details = reading2.details;
			}
		}
	}
	//TODO: test if this works with non-empty readings (difficult to find example with identical witnesses)
	if (reading1.hasOwnProperty('overlap')) {
		newreading.overlap = true;
	}
},

/** combine two word token properties*/
combine_words: function (new_word, old_word, witness) {
	var i;
	if (!new_word.hasOwnProperty('index')) {
		new_word.index = old_word.index;
	}
	if (!new_word.hasOwnProperty('verse')) {
		new_word.verse = old_word.verse;
	}
	if (!new_word.hasOwnProperty('interface')) {
		new_word['interface'] = old_word['interface'];
	}
	if (!new_word.hasOwnProperty('reading')) {
		new_word.reading = [];
	}
	if (old_word.hasOwnProperty('regularised')) {
		new_word.regularised = old_word.regularised;
	}
	if (old_word.hasOwnProperty('was_gap')) {
		new_word.was_gap = old_word.was_gap;
	}
	if (old_word.hasOwnProperty('combined_gap_before')) {
		if (!new_word.hasOwnProperty('combined_gap_before')) {
			new_word.combined_gap_before = old_word.combined_gap_before;
		} else {
			for (i = 0; i < old_word.combined_gap_before.length; i += 1) {
				if (new_word.combined_gap_before.indexOf(old_word.combined_gap_before[i]) === -1) {
					new_word.combined_gap_before.push(old_word.combined_gap_before[i]);
				}
			}
		}
	}
	if (old_word.hasOwnProperty('combined_gap_before_details')) {
		new_word.combined_gap_before_details = old_word.combined_gap_before_details;
	}
	if (old_word.hasOwnProperty('combined_gap_after')) {
		if (!new_word.hasOwnProperty('combined_gap_after')) {
			new_word.combined_gap_after = old_word.combined_gap_after;
		} else {
			for (i = 0; i < old_word.combined_gap_after.length; i += 1) {
				if (new_word.combined_gap_after.indexOf(old_word.combined_gap_after[i]) === -1) {
					new_word.combined_gap_after.push(old_word.combined_gap_after[i]);
				}
			}
		}
	}
	new_word[witness] = old_word[witness];
	for (i = 0; i < old_word.reading.length; i += 1) {
		if (old_word.reading[i] === witness) {
			new_word.reading.push(old_word.reading[i]);
		}
	}
	return new_word;
},

separate_individual_overlap_witnesses: function (witness_list, overlaps) {
	var key, i, new_adds, ol_adds, ol_unit, ol_rdg_details;
	new_adds = [];
	for (key in overlaps) {
		if (overlaps.hasOwnProperty(key)) {
			ol_unit = CL.find_overlap_unit_by_id(key);
			ol_rdg_details = {};

			if (ol_unit.readings.length > 1 && ol_unit.readings[1].hasOwnProperty('type')) {
				ol_rdg_details.type = ol_unit.readings[1].type;
			} else if (ol_unit.readings[0].hasOwnProperty('type')) { //if it is an om that is overlapped and basetext is also om then there will only be on reading in the data structure even though display shows two
				ol_rdg_details.type = ol_unit.readings[0].type;
			}
			if (ol_unit.readings.length > 1 && ol_unit.readings[1].hasOwnProperty('details')) {
				ol_rdg_details.details = ol_unit.readings[1].details;
			} else if (ol_unit.readings[0].hasOwnProperty('details')) {
				ol_rdg_details.details = ol_unit.readings[0].details;
			}
			ol_adds = [];
			for (i = 0; i < overlaps[key].length; i += 1) {
				if (witness_list.indexOf(overlaps[key][i]) !== -1) {
					ol_adds.push(overlaps[key][i]);
				}
			}
			if (ol_adds.length > 0) {
				new_adds.push([ol_adds, ol_rdg_details]);
			}
		}
	}
	return new_adds;
},

/** split unit stuff*/ 
do_split_unit: function (unit, app_id, index) {
	var i, j, text, apps, witnesses, witnesses_copy, overlap_witnesses, ol_witnesses_copy, words, key, words_dict, scroll_offset, rdg, add,
	split_adds, newunit, om_readings_copy, lac_readings_copy, new_reading;
	scroll_offset = [document.getElementById('scroller').scrollLeft, 
	                 document.getElementById('scroller').scrollTop];
	SV.add_to_undo_stack(CL._data);
	CL.hide_tooltip();
	SV.prepare_for_operation();
	words = [];
	text = [];
	apps = [];
	witnesses = [];
	overlap_witnesses = {}; //this is a keyed by overlap_status
	//get all the witnesses in the unit and any in corresponding overlapping units (using the overlap_status flag)
	for (i = 0; i < unit.readings.length; i += 1) {
		witnesses.push.apply(witnesses, CL.get_all_reading_witnesses(unit.readings[i]));
		if (unit.readings[i].hasOwnProperty('overlap_status')) {
			if (!overlap_witnesses.hasOwnProperty(unit.readings[i].overlap_status)) {
				overlap_witnesses[unit.readings[i].overlap_status] = [];
			}
			overlap_witnesses[unit.readings[i].overlap_status].push.apply(overlap_witnesses[unit.readings[i].overlap_status], CL.get_all_reading_witnesses(unit.readings[i]));
		}
		//while we are looping through readings remove any combined gap information so all the gaps come back
		if (unit.readings[i].hasOwnProperty('combined_gap_before_subreadings')) {
			delete unit.readings[i].combined_gap_before_subreadings;
			if (unit.readings[i].hasOwnProperty('combined_gap_before_subreadings_details')) {
				delete unit.readings[i].combined_gap_before_subreadings_details;
			}
		}
		if (unit.readings[i].hasOwnProperty('combined_gap_after_subreadings')) {
			delete unit.readings[i].combined_gap_after_subreadings;
		}
		if (unit.readings[i].text.length > 0) {
			if (unit.readings[i].text[0].hasOwnProperty('combined_gap_before')) {
				delete unit.readings[i].text[0].combined_gap_before;
				if (unit.readings[i].text[0].hasOwnProperty('combined_gap_before_details')) {
					delete unit.readings[i].text[0].combined_gap_before_details;
				}
			}
			if (unit.readings[i].text[unit.readings[i].text.length-1].hasOwnProperty('combined_gap_after')) {
				delete unit.readings[i].text[unit.readings[i].text.length-1].combined_gap_after;
			}
		}
	}
	//make a sets of all of witnesses
	witnesses = CL.set_list(witnesses);
	//remove any om and lac verse witnesses
	if (CL._data.hasOwnProperty('om_readings')) {
		for (i = 0; i < CL._data.om_readings.length; i += 1) {
			witnesses.splice(witnesses.indexOf(CL._data.om_readings[i]), 1);
		}
	}
	if (CL._data.hasOwnProperty('lac_readings')) {
		for (i = 0; i < CL._data.lac_readings.length; i += 1) {
			witnesses.splice(witnesses.indexOf(CL._data.lac_readings[i]), 1);
		}
	}            
	//get all the words from all readings and mark those from overlapping readings
	for (i = 0; i < unit.readings.length; i += 1) {
		if (unit.readings[i].hasOwnProperty('overlap_status')) {
			for (j = 0; j < unit.readings[i].text.length; j += 1) {
				unit.readings[i].text[j].overlap_status = unit.readings[i].overlap_status;
			}
		}
		words.push.apply(words, unit.readings[i].text);
	}
	//sort the words based on their indexes
	words.sort(CL.compare_indexes);
	//build a dictionary of words using the word's index numbers as keys
	words_dict = {};
	for (i = 0; i < words.length; i += 1) {
		if (words_dict.hasOwnProperty(words[i].index)) {
			words_dict[words[i].index].push(words[i]);
		} else {
			words_dict[words[i].index] = [(words[i])];
		}
	}
	for (key in words_dict) {
		if (words_dict.hasOwnProperty(key)) {
			text.push(words_dict[key]);
		}
	}
	//step through the words again and construct the variant unit data structure
	//here text is a list containing all the tokens at this index point in the split
	for (i = 0; i < text.length; i += 1) {
		witnesses_copy = JSON.parse(JSON.stringify(witnesses)); //work on a copy
		ol_witnesses_copy = JSON.parse(JSON.stringify(overlap_witnesses));
		newunit = {'start' : parseInt(text[i][0].index, 10),
				'end' : parseInt(text[i][0].index, 10),
				'first_word_index' : text[i][0].index,
				'readings' : [],
		};
		if (unit.hasOwnProperty('overlap_units')) {
			newunit.overlap_units = JSON.parse(JSON.stringify(unit.overlap_units)); //make a copy or somehow they stay linked
		}
		for (j = 0; j < text[i].length; j += 1) {
			if (typeof text[i][j].witnesses !== 'undefined') { //TODO: check if this condition is ever used
				newunit.readings.push(text[i][j]);
			} else {
				rdg = {'witnesses' : text[i][j].reading.slice(0), 'text' : [text[i][j]]};
				if (text[i][j].hasOwnProperty('overlap_status')) {
					rdg.overlap_status = text[i][j].overlap_status;
				}
				newunit.readings.push(rdg);
			}
		}
		for (j = 0; j < newunit.readings.length; j += 1) {
			for (var k = 0; k < newunit.readings[j].witnesses.length; k += 1) {
				witnesses_copy.splice(witnesses_copy.indexOf(newunit.readings[j].witnesses[k]), 1);
			}
		}
		if (witnesses_copy.length > 0) {
			for (key in overlap_witnesses) {
				if (overlap_witnesses.hasOwnProperty(key)) {
					add = [];
					if (overlap_witnesses[key].length > 0) {
						for (j = 0; j < overlap_witnesses[key].length; j += 1) {
							if (witnesses_copy.indexOf(overlap_witnesses[key][j]) !== -1) {
								add.push(overlap_witnesses[key][j]);
								witnesses_copy.splice(witnesses_copy.indexOf(overlap_witnesses[key][j]), 1);
							}
						}
						if (add.length > 0) {
							if (unit.hasOwnProperty('overlap_units')) {
								split_adds = SV.separate_individual_overlap_witnesses(add, unit.overlap_units);
								for (k = 0; k < split_adds.length; k += 1) {
									if (key === 'duplicate') {
										new_reading = {'witnesses': split_adds[k][0], 'text' : [], 'overlap_status': key};
										if (split_adds[k][1].hasOwnProperty('type')) {
											new_reading.type = split_adds[k][1].type;
										} else {
											new_reading.type = 'om';
										}
										if (split_adds[k][1].hasOwnProperty('details')) {
											new_reading.details = split_adds[k][1].details;
										}
										newunit.readings.push(new_reading);
									} else {
										newunit.readings.push({'witnesses': split_adds[k][0], 'text' : [], 'overlap_status': key, 'type': 'om'});
									}
								}
							} else {
								newunit.readings.push({'witnesses': add, 'text' : [], 'overlap_status': key, 'type': 'om'});
							}
						}
					}
				}
			}
			if (witnesses_copy.length > 0) {
				newunit.readings.push({'witnesses': witnesses_copy, 'text' : [], 'type': 'om'});
			}
		}
		if (CL._data.hasOwnProperty('om_readings') && CL._data.om_readings.length > 0) {
			om_readings_copy = CL._data.om_readings.slice(0)
			for (key in overlap_witnesses) {
				if (overlap_witnesses.hasOwnProperty(key)) {
					add = [];
					if (overlap_witnesses[key].length > 0) {
						for (j = 0; j < overlap_witnesses[key].length; j += 1) {
							if (om_readings_copy.indexOf(overlap_witnesses[key][j]) !== -1) {
								add.push(overlap_witnesses[key][j]);
								om_readings_copy.splice(om_readings_copy.indexOf(overlap_witnesses[key][j]), 1);
							}
						}
						if (add.length > 0) {
							newunit.readings.push({'witnesses': add, 'text' : [], 'overlap_status': key, 'type': 'om_verse', 'details': 'om verse'});
						}
					}
				}
			}
			if (om_readings_copy.length > 0) {
				newunit.readings.push({'witnesses': om_readings_copy, 'text': [], 'type': 'om_verse', 'details': 'om verse'});
			}         
		}
		if (CL._data.hasOwnProperty('lac_readings') && CL._data.lac_readings.length > 0) {
			lac_readings_copy = CL._data.lac_readings.slice(0)
			for (key in overlap_witnesses) {
				if (overlap_witnesses.hasOwnProperty(key)) {
					add = [];
					if (overlap_witnesses[key].length > 0) {
						for (j = 0; j < overlap_witnesses[key].length; j += 1) {
							if (lac_readings_copy.indexOf(overlap_witnesses[key][j]) !== -1) {
								add.push(overlap_witnesses[key][j]);
								lac_readings_copy.splice(lac_readings_copy.indexOf(overlap_witnesses[key][j]), 1);
							}
						}
						if (add.length > 0) {
							newunit.readings.push({'witnesses': add, 'text' : [], 'overlap_status': key, 'type': 'lac_verse', 'details': 'lac verse'});
						}
					}
				}
			}
			if (lac_readings_copy.length > 0) {
				newunit.readings.push({'witnesses': lac_readings_copy, 'text': [], 'type': 'lac_verse', 'details': 'lac verse'});
			}
		}
		CL.add_unit_id(newunit);
		apps.push(newunit);
	}
	//replace the current data with this new stuff
	CL._data[app_id].splice(index, 1);
	for (i = apps.length - 1; i >= 0; i -= 1) {
		CL.add_unit_id(apps[i]);
		CL.add_reading_ids(apps[i]);
		CL._data[app_id].splice(index, 0, apps[i]);
		SV.unsplit_unit_witnesses(index, app_id);
		//if this is an overlapped unit split the base text out as the a reading
		if (app_id !== 'apparatus') {
			for (j = 0; j < unit.readings.length; j += 1) {
				if (unit.readings[j].witnesses.indexOf(CL._data_settings.base_text_siglum) !== -1) {
					SV.do_split_reading_witnesses(index, 0, [CL._data_settings.base_text_siglum], app_id, false);
					break;
				}                    
			}
		}   
	}
	//now sort them by start index and then by index of first item in text
	CL._data[app_id].sort(CL.compare_first_word_indexes);   
	SV.tidy_units(app_id);            
	SV.unprepare_for_operation();
	SV.check_bug_status('split', app_id + ' unit ' + index + '.');
	SV.show_set_variants_data();
	document.getElementById('scroller').scrollLeft = scroll_offset[0];
	document.getElementById('scroller').scrollTop = scroll_offset[1];
},

/** split the unit into individual words */
split_unit: function (index) {
	var i, j, app_id, apparatus_num, scroll_offset, operation_needed;
	scroll_offset = [document.getElementById('scroller').scrollLeft, 
	                 document.getElementById('scroller').scrollTop];
	//find the correct apparatus
	if (index.match(/_app_/g)) {
		apparatus_num = parseInt(index.match(/\d+/g)[1], 10);
		index = parseInt(index.match(/\d+/g)[0], 10);
		app_id = 'apparatus' + apparatus_num;
	} else {
		app_id = 'apparatus';
	}
	//make sure this only happens if at least one of the readings has more that one token or one has combined gap before or after
	//at this point all subreadings will be same length as main reading or have been turned back into main readings by prepare_for_operation
	operation_needed = false;
	for (i = 0; i < CL._data[app_id][index].readings.length; i += 1) {
		if (CL._data[app_id][index].readings[i].text.length > 1) {
			operation_needed = true;
		} else if (CL._data[app_id][index].readings[i].text.length > 0 
				&& (CL._data[app_id][index].readings[i].text[0].hasOwnProperty('combined_gap_before') 
						|| CL._data[app_id][index].readings[i].text[0].hasOwnProperty('combined_gap_after') )) {
			operation_needed = true;
		} else if (CL._data[app_id][index].readings[i].hasOwnProperty('combined_gap_before_subreadings')
				|| CL._data[app_id][index].readings[i].hasOwnProperty('combined_gap_after_subreadings')) {
			operation_needed = true;
		}
	}
	if (operation_needed === true) {
		SV.do_split_unit(CL._data[app_id][index], app_id, index);
	} else {
		SV.show_set_variants_data();
		document.getElementById('scroller').scrollLeft = scroll_offset[0];
		document.getElementById('scroller').scrollTop = scroll_offset[1];
	}
},

/** Called after splitting units to push any addition readings into the following gap*/
tidy_units: function (app_id) {
	var i;
	for (i = CL._data[app_id].length-1; i >= 0 ; i = i - 1) { // loop backwards so if more than one needs to be moved they stay in the correct order
		//if start and end are the same and its an even number
		if (CL._data[app_id][i].start === CL._data[app_id][i].end && CL._data[app_id][i].start%2 === 0) {
			if (CL.sort_readings(CL._data[app_id][i].readings)[0].text.length === 0) {
				//move the extra one to the next unit space
				CL._data[app_id][i].start = CL._data[app_id][i].start + 1;
				CL._data[app_id][i].end = CL._data[app_id][i].end + 1;
				SV.reindex_unit(CL._data[app_id][i].start);
			}
		}
	}
},




/** Overlap related stuff */ 

/** checks that a single word/space index of the base text has a single unit of variation underneath it.
 * i.e. that a space only has one unit that starts and ends at that index.
 * This is used as a check before making an overlapping reading as it makes the overlap code easier 
 * it is only relevant for first line of apparatus so only need to supply unit_num */
check_unit_uniqueness: function (unit_num, app_id) {
	var start, end, prev_start, prev_end, next_start, next_end;
	//get start and end words of unit
	start = CL._data[app_id][unit_num].start;
	end = CL._data[app_id][unit_num].end;
	//check the unit before
	if (unit_num > 0) {
		prev_start = CL._data[app_id][unit_num - 1].start;
		prev_end = CL._data[app_id][unit_num - 1].end;
		if (prev_start === start || prev_start === end || prev_end === start || prev_start === end) {
			return false;
		}
	}
	//check the unit after
	if (unit_num + 1 < CL._data[app_id].length) {
		next_start = CL._data[app_id][unit_num + 1].start;
		next_end = CL._data[app_id][unit_num + 1].end;
		if (next_start === start || next_start === end || next_end === start || next_start === end) {
			return false;
		}
	}
	return true;
},

get_pos_in_unit_set: function (unit_num, app_id) {
	//build a list of units that start and end with the same values
	//remembering where the target it
	var start, end, unit_list, hit_pos, i, prev_start, prev_end, next_start, next_end;
	start = CL._data[app_id][unit_num].start;
	end = CL._data[app_id][unit_num].end;
	unit_list = ['hit'];
	i = 1;
	while (unit_num - i > 0) {
		prev_start = CL._data[app_id][unit_num - i].start;
		prev_end = CL._data[app_id][unit_num - i].end;
		if (prev_start === start && prev_end === end) {
			unit_list.splice(0, 0, 'pre');
			i += 1;
		}
		else {
			break;
		}
	}
	i = 1;
	while (unit_num + i < CL._data[app_id].length) {
		next_start = CL._data[app_id][unit_num + i].start;
		next_end = CL._data[app_id][unit_num + i].end;
		if (next_start === start && next_end === end) {
			unit_list.push('post');
			i += 1;
		} else {
			break;
		}
	}
	return [unit_list.indexOf('hit'), unit_list.length];
},

/** displays menu for splitting witnesses of a reading */
split_reading_witnesses: function (rdg_details, stage, menu_pos) {
	var i, reading, scroll_offset, witness_list, data, key, duplicate,
	window_height, menu_height, unit, id;
	scroll_offset = [document.getElementById('scroller').scrollLeft, 
	                 document.getElementById('scroller').scrollTop];
	reading = CL._data[rdg_details[1]][rdg_details[0]].readings[rdg_details[2]];
	if (CL.get_all_reading_witnesses(reading).length > 1) {
		CL.show_split_witness_menu(reading, menu_pos, {'type': 'duplicate', 'header': 'Select witnesses', 'button': 'Split witnesses'});
		$('#select_button').on('click', function (event) {
			witness_list = [];
			data = U.FORMS.serialize_form('select_wit_form');
			if (!$.isEmptyObject(data)) {
				witness_list = [];
				for (key in data) {
					if (data.hasOwnProperty(key)) {
						witness_list.push(key);
					}
				}
			}
			if (stage === 'order_readings') {
				OR.add_to_undo_stack(CL._data);
			}
			//Do not need to prepare for this operation as we just manipulate all the data directly and we need everything to stay as subreadings etc.
			//make the data structure to remember this split
			if (!CL._data.hasOwnProperty('separated_witnesses')) {
				CL._data.separated_witnesses = [];
			}
			unit = CL._data[rdg_details[1]][rdg_details[0]];
			CL._data.separated_witnesses.push({'app_id': rdg_details[1], 'unit_id': unit._id, 'witnesses': witness_list});
			SV.do_split_reading_witnesses(rdg_details[0], rdg_details[2], witness_list, rdg_details[1], true);
			document.getElementsByTagName('body')[0].removeChild(document.getElementById('wit_form')); 
			if (stage === 'set_variants') {
				SV.check_bug_status('move', 'split witnesses ' + witness_list.join(', ') + ' out of reading ' + rdg_details[2] + ' in unit ' + rdg_details[0] + ' in apparatus.');
				SV.show_set_variants_data();
			} 
			if (stage === 'order_readings') {
				OR.relabel_readings(CL._data[rdg_details[1]][rdg_details[0]].readings);
				OR.show_reorder_readings({'container': CL._container});
			}
			document.getElementById('scroller').scrollLeft = scroll_offset[0];
			document.getElementById('scroller').scrollTop = scroll_offset[1];
		});      	
	} else {
		SV.set_up_message('error', 'ERROR: Readings with a single witness cannot be split');
	}
},


//duplicate is retained here just in case minds are changed on always duplicating it will always be true as will not show on menu
/** make a reading overlap (move to new line of apparatus) */
overlap_reading: function (unit_num, reading_num, menu_pos) {
	var i, reading, error_mess, duplicate,
	scroll_offset, witness_list, data, key,
	new_reading_id, window_height, menu_height;
	scroll_offset = [document.getElementById('scroller').scrollLeft,
	                 document.getElementById('scroller').scrollTop];
	duplicate = true;
	if (SV.check_unit_uniqueness(unit_num, 'apparatus')) {
		reading = CL._data.apparatus[unit_num].readings[reading_num];
		if (!SV._has_standoff_subreading(reading)) {
			if (reading.witnesses.length > 1) {
				CL.show_split_witness_menu(reading, menu_pos, {'type': 'overlap', 'header': 'Select witnesses to overlap', 'button': 'Overlap witnesses'});
				$('#select_button').on('click', function (event) {
					witness_list = [];
					data = U.FORMS.serialize_form('select_wit_form');
					if (!$.isEmptyObject(data)) {
						witness_list = [];
						for (key in data) {
							if (key === 'duplicate') {
								duplicate = true;
							} else if (data.hasOwnProperty(key)) {
								witness_list.push(key);
							}
						}
					}
					new_reading_id = SV.do_split_reading_witnesses(unit_num, reading_num, witness_list, 'apparatus', true);
					SV.make_overlapping_reading(unit_num, new_reading_id, duplicate);
					document.getElementsByTagName('body')[0].removeChild(document.getElementById('wit_form'));
				});
			} else {
				SV.make_overlapping_reading(unit_num, reading._id, duplicate);
			}
		} else {
			error_mess = 'ERROR: readings which have a subreading created in set variants (as apposed to in the regulariser) cannot be overlapped';
			//the other kind of regularised readings are okay because they will always be token for token and never involve gaps having been regularised or different reading lengths
			SV.show_set_variants_data({'message': {'type': 'error', 'message': error_mess}});
			document.getElementById('scroller').scrollLeft = scroll_offset[0];
			document.getElementById('scroller').scrollTop = scroll_offset[1];
		}
	} else {
		error_mess = 'ERROR: variation units have to be merged for each index point before creating an overlapping variant';
		SV.show_set_variants_data({'message': {'type': 'error', 'message': error_mess}});
		document.getElementById('scroller').scrollLeft = scroll_offset[0];
		document.getElementById('scroller').scrollTop = scroll_offset[1];
	}
},        

make_overlapping_reading: function (unit_num, reading_id, duplicate) {
	var i, j, original_unit, a_reading, reading, newunit, found, key, scroll_offset, ol_id, new_word, temp, app_ids;
	scroll_offset = [document.getElementById('scroller').scrollLeft, 
	                 document.getElementById('scroller').scrollTop];
	SV.add_to_undo_stack(CL._data);
	original_unit = CL._data.apparatus[unit_num];
	a_reading = CL._data.apparatus[unit_num].readings[0];
	reading = CL.find_reading_by_id(original_unit, reading_id);
	//must do this after we have caputured the readings or is messes up positions! we don't use positions for the reading anymore but it can stay here anyway
	SV.prepare_for_operation(); //we do this because it makes sorting out the gaps easier. Any reading with standoff overlap has already been disallowed overlap status by this point
	if (duplicate === true) {
		reading.overlap_status = 'duplicate';
	}           
	//make the new unit for the overlapping reading
	newunit = {};
	newunit.start = CL._data.apparatus[unit_num].start;
	newunit.end = CL._data.apparatus[unit_num].end; //end is pointless we never use it for displaying but we do need a value because most things (especially id adding functions) assume its there
	newunit.first_word_index = CL._data.apparatus[unit_num].first_word_index;
	//work out the first app line that has space for the unit
	app_ids = CL.get_ordered_app_lines();
	if (app_ids.length === 0) {
		newunit.row = 2;
	} else {
		for (i = 0; i < app_ids.length; i += 1) {
			found = false;
			for (j = 0; j < CL._data[app_ids[i]].length; j += 1) {
				if (CL._data[app_ids[i]][j].start <= newunit.start && CL._data[app_ids[i]][j].end >= newunit.end) {       		    
					found = true;
				}
			}
			if (!found) {
				newunit.row = parseInt(app_ids[i].replace('apparatus', ''));
				break; 
			}
		}
		if (typeof newunit.row === 'undefined') {
			newunit.row = parseInt(app_ids[app_ids.length-1].replace('apparatus', '')) + 1;
		}
	}    
	newunit.readings = [JSON.parse(JSON.stringify(a_reading)), JSON.parse(JSON.stringify(reading))];
	delete newunit.readings[1].overlap_status;
	newunit.readings[0].witnesses = [CL._data_settings.base_text_siglum];
	delete newunit.readings[0].subreadings;
	delete newunit.readings[0].otherreadings;
	for (i = 0; i < newunit.readings[0].text.length; i += 1) {
		for (key in newunit.readings[0].text[i]) {
			if (newunit.readings[0].text[i].hasOwnProperty(key)) {
				if ([CL._data_settings.base_text_siglum, 'verse', 'interface', 't', 'rule_string', 'index', 'siglum'].indexOf(key) === -1) {
					delete newunit.readings[0].text[i][key];
				}
			}
		}
		newunit.readings[0].text[i].reading = [CL._data_settings.base_text_siglum];
	}
	//now sort out any gaps which need to become full readings
	//this must happen after we have copied the subreading (which now becomes the 'genuine' presentation of this reading)
	for (i = reading.text.length-1; i >= 0; i -= 1) {
		if (reading.text[i][reading.witnesses[0]].hasOwnProperty('gap_after') 
				&& (i + 1 >= reading.text.length || (i + 1 < reading.text.length && !reading.text[i+1].hasOwnProperty('was_gap')))) { //this was_gap use is safe as only triggered while making overlap and order will not have been changed at this point
			if (i < reading.text.length - 1 || i === reading.text.length -1 && newunit.readings[1].text[newunit.readings[1].text.length-1].hasOwnProperty('combined_gap_after')) {
				new_word = {
						'index': SV.increment_sub_index(reading.text[i].index, 1), 
						'interface': '&lt;' + reading.text[i][reading.witnesses[0]].gap_details + '&gt;',
						'was_gap': true,
						'verse': reading.text[i].verse,
						'reading': [],
				}
				for (j = 0; j < reading.witnesses.length; j += 1) {
					new_word.reading.push(reading.witnesses[j]);
					new_word[reading.witnesses[j]] = {'index': SV.increment_main_index(reading.text[i][reading.witnesses[j]].index, 1), 'original': new_word['interface']};
					if (reading.text[i][reading.witnesses[j]].hasOwnProperty('gap_after')) {
						delete reading.text[i][reading.witnesses[j]].gap_after; //the absence of this flag is only important for extract text which only cares about this reading so we don't need to look at any previous units
					}
				}
				delete reading.text[i].combined_gap_after;
				reading.text.splice(i+1, 0, new_word);
			}
		}
		if (i === 0 && newunit.readings[1].text[0].hasOwnProperty('combined_gap_before')) {
			new_word = {
					'interface': '&lt;' + newunit.readings[1].text[0].combined_gap_before_details + '&gt;',
					'was_gap': true,
					'verse': reading.text[i].verse,
					'reading': [],
			}
			if (parseInt(reading.text[0].index)%2 === 0) { //check to see if it is an even numbered index
				temp = SV.decrement_main_index(reading.text[0].index, 1);
				new_word.index = temp.split('.')[0] + '.99';
			} else {
				new_word.index = SV.decrement_sub_index(reading.text[i].index, 1);
				reading.text[i].index = SV.increment_sub_index(new_word.index, 1);
			}    		
			for (j = 0; j < reading.witnesses.length; j += 1) {
				new_word.reading.push(reading.witnesses[j]);
				new_word[reading.witnesses[j]] = {'index': String(reading.text[i][reading.witnesses[j]].index - 1), 'original': new_word['interface']};
				if (reading.text[i][reading.witnesses[j]].hasOwnProperty('gap_before')) {
					delete reading.text[i][reading.witnesses[j]].gap_before;
				}
			}
			delete reading.text[0].combined_gap_before;
			delete reading.text[0].combined_gap_before_details;
			reading.text.splice(0, 0, new_word);
		}       	
		reading = SV.fix_index_numbers(reading);
	}
	//get the id and then add it to the original unit so we know the extent of this overlapping unit
	ol_id = CL.add_unit_id(newunit, 'apparatus' + newunit.row);
	if (!CL._data.apparatus[unit_num].hasOwnProperty('overlap_units')) {
		CL._data.apparatus[unit_num].overlap_units = {};
	}
	CL._data.apparatus[unit_num].overlap_units[ol_id] = CL.get_all_reading_witnesses(reading);
	if (CL._data.hasOwnProperty('apparatus' + newunit.row)) {
		CL._data['apparatus' + newunit.row].push(newunit);
		CL._data['apparatus' + newunit.row].sort(CL.compare_first_word_indexes);
	} else {
		CL._data['apparatus' + newunit.row] = [newunit];
	}
	SV.unprepare_for_operation();
	SV.check_bug_status('make overlapping reading', 'of witnesses ' + CL.get_all_reading_witnesses(newunit.readings[1]).join(', '));            
	SV.show_set_variants_data();
	document.getElementById('scroller').scrollLeft = scroll_offset[0];
	document.getElementById('scroller').scrollTop = scroll_offset[1];
},

/** move an overlapping reading to a different row (same column)*/
move_overlapping: function (unit_details, target_row) {
	var unit, scroll_offset;
	scroll_offset = [document.getElementById('scroller').scrollLeft,
	                 document.getElementById('scroller').scrollTop];
	SV.add_to_undo_stack(CL._data);
	unit = CL._data[unit_details[1]][unit_details[0]];
	unit.row = target_row;
	CL._data['apparatus' + target_row].push(unit);
	CL._data['apparatus' + target_row].sort(CL.compare_first_word_indexes);
	CL._data[unit_details[1]].splice(unit_details[0], 1);
	SV.check_bug_status('move overlapping unit', unit_details[0] + ' from ' + unit_details[1] + ' to ' + target_row + '.');
	SV.show_set_variants_data();
	document.getElementById('scroller').scrollLeft = scroll_offset[0];
	document.getElementById('scroller').scrollTop = scroll_offset[1];
},

//TODO: we don't actually use this now but it might form the basis of being able to recombined overlapped readings with the top row
/** merge two overlapping readings from the same column or merge an overlapped back into the main reading*/
merge_overlaps: function (units, rd) {
	var i, j, k, unit1, unit2, text_string, target, counter, error_mess, scroll_offset;
	scroll_offset = [document.getElementById('scroller').scrollLeft,
	                 document.getElementById('scroller').scrollTop];
	unit1 = CL._data[units[0][1]][units[0][0]];
	unit2 = CL._data[units[1][1]][units[1][0]];
	SV.add_to_undo_stack(CL._data);
	//if we are merging back in with the top apparatus
	//TODO: do these extract witness text calls need the unit_id?
	if (units[0][1] === 'apparatus') {
		for (i = 1; i < unit2.readings.length; i += 1) {
			text_string = CL.extract_witness_text(unit2.readings[i]);
			for (j = 0; j < unit1.readings.length; j += 1) {
				if (CL.extract_witness_text(unit1.readings[j]) === text_string) {
					for (k = 0; k < unit1.readings[j].witnesses.length; k += 1) {
						if (unit2.readings[i].witnesses.indexOf(unit1.readings[j].witnesses[k]) !== -1) {
							delete unit1.readings[j].overlap;
							unit2.readings[i].witnesses.splice(unit2.readings[i].witnesses.indexOf(unit1.readings[j].witnesses[k]), 1, null);
						}
					}
					CL.remove_null_items(unit2.readings[i].witnesses);
					if (unit2.readings[i].witnesses.length === 0) {
						unit2.readings.splice(i, 1, null);
					}
				}
			}
		}
		CL.remove_null_items(unit2.readings);
		if (unit2.readings.length === 1) {
			CL._data[units[1][1]].splice(units[1][0], 1);
		} else {
			warning_mess = 'WARNING: Not all readings could be merged';
			SV.unsplit_unit_witnesses(units[0][0], units[0][1]);
			SV.check_bug_status('merge overlap', 'merge unit ' + units[1][0] + ' from ' + units[1][1] + ' into unit ' + units[0][0] + ' in ' + units[0][1] + '.');
			SV.show_set_variants_data({'message': {'type': 'warning', 'message': warning_mess}});
			document.getElementById('scroller').scrollLeft = scroll_offset[0];
			document.getElementById('scroller').scrollTop = scroll_offset[1];
		}
	} else {
		//just shove it in the reading and let unsplit_unit_witnesses sort out the mess left behind!
		for (i = 1; i < unit2.readings.length; i += 1) {
			unit1.readings.push(unit2.readings[i]);
		}
		//delete the one you moved
		CL._data[units[1][1]].splice(units[1][0], 1);
	}
	SV.unsplit_unit_witnesses(units[0][0], units[0][1]);
	SV.check_bug_status('merge overlap', 'merge unit ' + units[1][0] + ' from ' + units[1][1] + ' into unit ' + units[0][0] + ' in ' + units[0][1] + '.');
	SV.show_set_variants_data();
	document.getElementById('scroller').scrollLeft = scroll_offset[0];
	document.getElementById('scroller').scrollTop = scroll_offset[1];
},


//Integrity checks 

//check order integrity in all witnesses
check_all_witnesses_integrity: function () {
	var hand;
	for (hand in CL._data.hand_id_map) {
		if (CL._data.hand_id_map.hasOwnProperty(hand)) {
			if (SV.check_witness_integrity(hand) == false) {
				return false;
			}
		}
	}
	return true;
},

//check a single witness in the whole verse
check_witness_integrity: function (witness) {
	var i, j, k, l, index, unit, id, key, ol_unit, type;
	index = 0;
	for (i = 0; i < CL._data.apparatus.length; i += 1) { //step through the top line apparatus
		unit = CL._data.apparatus[i]; //get the current unit
		if (unit.hasOwnProperty('overlap_units') && !unit.overlap_units.hasOwnProperty(id)) {
			for (key in unit.overlap_units) {
				if (unit.overlap_units.hasOwnProperty(key) && unit.overlap_units[key].indexOf(witness) !== -1) {
					id = key; //set id to the id of the overlapped unit (anything above this unit will now be ignored)      		   
					ol_unit = CL.find_overlap_unit_by_id(key);
					for (j = 0; j < ol_unit.readings.length; j += 1) {
						if (ol_unit.readings[j].witnesses.indexOf(witness) !== -1) {
							if (ol_unit.readings[j].hasOwnProperty('standoff_subreadings') && ol_unit.readings[j].standoff_subreadings.indexOf(witness) !== -1) { 
								for (type in ol_unit.readings[j].subreadings) {
									for (k = 0; k < ol_unit.readings[j][type].length; k += 1) {
										if (ol_unit.readings[j][type][k].indexOf(witness) !== -1) {
											for (l = 0; l < ol_unit.readings[j][type][k].text.length; l += 1) {
												if (ol_unit.readings[j][type][k].text[l][witness]['index'] - index === 2) {
													index = ol_unit.readings[j].text[k][witness]['index'];
												} else {
													return false;
												}
											}
										}
									}
								}
							} else if (ol_unit.readings[j].hasOwnProperty('SR_text') && ol_unit.readings[j].SR_text.hasOwnProperty(witness)) {
								for (k = 0; k < ol_unit.readings[j].SR_text[witness].text.length; k += 1) {
									if (ol_unit.readings[j].SR_text[witness].text[k][witness]['index'] - index === 2) {
										index = ol_unit.readings[j].SR_text[witness].text[k][witness]['index'];
									} else {
										return false;
									}
								}
							} else {
								for (k = 0; k < ol_unit.readings[j].text.length; k += 1) {
									if (ol_unit.readings[j].text[k][witness]['index'] - index === 2) {
										index = ol_unit.readings[j].text[k][witness]['index'];
									} else {
										return false;
									}
								}
							}   
						}
					}
				}
			}
		} 
		//this needs to be a separate if and not in an else because the top loop ultimately only hits the units where the specified witness is overlapped - this one deals with all the rest
		if (!unit.hasOwnProperty('overlap_units') || (unit.hasOwnProperty('overlap_units') && !unit.overlap_units.hasOwnProperty(id))) {
			for (j = 0; j < unit.readings.length; j += 1) {
				if (unit.readings[j].witnesses.indexOf(witness) !== -1) {
					//check the main reading
					if (unit.readings[j].text.length > 0 && unit.readings[j].text[0].hasOwnProperty(witness)) {
						for (k = 0; k < unit.readings[j].text.length; k += 1) {
							if (unit.readings[j].text[k][witness]['index'] - index === 2) {
								index = unit.readings[j].text[k][witness]['index'];
							} else {
								return false;
							}
						}    
					}
					//TODO:check the subreadings? this will be complex if you can away without it then do!
					//so long as subreadings are always hidden then checking SR_text should be enough
					//check the SR_text
					if (unit.readings[j].hasOwnProperty('SR_text') && unit.readings[j].SR_text.hasOwnProperty(witness)) {
						for (k = 0; k < unit.readings[j].SR_text[witness].text.length; k += 1) {
							if (unit.readings[j].SR_text[witness].text[k][witness]['index'] - index === 2) {
								index = unit.readings[j].SR_text[witness].text[k][witness]['index'];
							} else {
								return false;
							}
						}
					}
				}
			}
		}
	}
	return true;
},

//used for checking the witness order is correct
get_first_index_for_witnesses: function (unit, witnesses) {
	var witness_index, wit, j, k;
	witness_index = {};
	for (j = 0; j < unit.readings.length; j += 1) {
		for (k = 0; k < unit.readings[j].witnesses.length; k += 1) {
			wit = unit.readings[j].witnesses[k];
			if (witnesses === undefined || witnesses.indexOf(wit) !== -1) {
				if (unit.readings[j].text.length > 0) {
					if (unit.readings[j].text[0].hasOwnProperty(wit)) {
						//this deals with main readings and visible subreadings
						witness_index[wit] = parseInt(unit.readings[j].text[0][wit].index, 10);
					} else {
						//this deals with stuff in SR_text for unshown standoff subreadings 
						if (unit.readings[j].hasOwnProperty('SR_text') && unit.readings[j].SR_text.hasOwnProperty(wit)) {
							witness_index[wit] = parseInt(unit.readings[j].SR_text[wit].text[0][wit].index, 10);
						}
					}                            
				} else {
					witness_index[wit] = 0;
				}
			}
		}
	}
	return witness_index;
},

compare_witness_queue: function (queue, problems) {
	var key;
	//if the overlapped witness unit covers the whole verse 
	if (queue.length !== 2) {
		return problems;
	}
	for (key in queue[0]) {
		if (problems.indexOf(key) === -1) { //if we already know its a problem we can ignore it
			if (queue[0].hasOwnProperty(key)) {
				if (queue[1].hasOwnProperty(key)) {
					if (queue[1][key] !== 0 && queue[0][key] > queue[1][key]) {
						problems.push(key);
					} else if (queue[1][key] === 0) {
						queue[1][key] = queue[0][key];
					}
				}
			}
		}
	}
	problems = CL.set_list(problems);
	return problems;
},

//witnesses supplied when we move a reading, but not when we move a whole unit
check_word_order_integrity: function (original_unit, new_unit, witnesses) {
	var i, j, working, problems, witness_queue, wit, indexes, start, end, unit, id, ol_unit,
	key;
	problems = [];
	working = false;
	witness_queue = [];
	start = Math.min(original_unit, new_unit);
	end = Math.max(original_unit, new_unit);
	indexes = [];
	for (i = 0; i < CL._data.apparatus.length; i += 1) {
		unit = CL._data.apparatus[i];
		//capture the unit that is the final location (where words may have been added) for later testing we will send it to check_unit_integrity
		if (unit.end === new_unit || unit.start === new_unit) {
			//this should always be the top line unit not an overlapped one (we will never have altered the overlap one) 
			indexes.push(i);
		}
		//check each pair of units in turn between the start unit and the end unit
		//each pair for comparison contains a dictionary with witnesses (supplied or all) as key to first index of witness in that unit
		if (unit.start >= start && working !== true) {
			working = true;
			witness_queue.push(SV.get_first_index_for_witnesses(unit, witnesses));
		} else if (unit.end > end) {
			if (witness_queue.length === 2) {
				witness_queue.shift();//remove first item from list
			}
			witness_queue.push(SV.get_first_index_for_witnesses(unit, witnesses));
			problems = SV.compare_witness_queue(witness_queue, problems);
			break;
		} else if (working === true) {
			if (witness_queue.length === 2) {
				witness_queue.shift(); //remove first item from list
			}
			witness_queue.push(SV.get_first_index_for_witnesses(unit, witnesses));
			problems = SV.compare_witness_queue(witness_queue, problems);
		}
	}
	for (i = 0; i < indexes.length; i += 1) {
		//now check the unit that is the final location because we might have added to it
		problems.push.apply(problems, SV.check_unit_integrity('apparatus', indexes[i]))
	}
	problems = CL.set_list(problems);
	//now run through the problems and see if any of the units selected as end units (should only ever be one!)
	//is overlapped (our other rules should provent moving of data that conflicts with overlaps so checking one feels safe)
	//if it is then it removed from the problems list and not reported
	for (i = 0; i < indexes.length; i += 1) {
		if (CL._data.apparatus[indexes[i]].hasOwnProperty('overlap_units')) {
			for (key in CL._data.apparatus[indexes[i]].overlap_units) {
				if (CL._data.apparatus[indexes[i]].overlap_units.hasOwnProperty(key)) {
					for (j = 0; j < CL._data.apparatus[indexes[i]].overlap_units[key].length; j += 1) {
						if (problems.indexOf(CL._data.apparatus[indexes[i]].overlap_units[key][j]) !== -1) {
							problems.splice(problems.indexOf(CL._data.apparatus[indexes[i]].overlap_units[key][j]), 1);
						}
					}
				}
			}
		}
	}
	SV._watch_list.push.apply(SV._watch_list, problems);
	SV._watch_list = CL.set_list(SV._watch_list);
	return problems;
},

//check every the words of every witness in the given unit are
//no more than 2 words apart
check_unit_integrity: function (app_id, index) {
	var i, j, k, problems, count, witness, unit;
	problems = [];
	unit = CL._data[app_id][index];
	for (i = 0; i < unit.readings.length; i += 1) {
		if (unit.readings[i].text.length > 0) {
			for (j = 0; j < unit.readings[i].witnesses.length; j += 1) {
				witness = unit.readings[i].witnesses[j];
				count = null;
				for (k = 0; k < unit.readings[i].text.length; k += 1) {
					if (unit.readings[i].text[k].hasOwnProperty(witness)) {
						//JS casts strings as ints if it can so this works despite index being a string
						if (count !== null && unit.readings[i].text[k][witness].index - count > 2) { //> used to be !== now it allows smaller gaps because of solidified gaps
							problems.push(witness);
						} else {
							count = unit.readings[i].text[k][witness].index;
						}
					}
				}
			}
		}
	}
	problems = CL.set_list(problems);
	SV._watch_list.push.apply(SV._watch_list, problems);
	SV._watch_list = CL.set_list(SV._watch_list);
	return problems;
},

//subreading functions

/** Get ready to do an operation of moving/combining/splitting etc.
 *  by making all offset subreadings main readings (in case following the action
 *  the standoff mark no longer applies) and by merging all non-standoff subreadings
 *  into their parents so we don't have to worry about them.
 */
prepare_for_operation: function (unit_details) {
	SV._remove_offset_subreadings(unit_details); //this runs find_subreadings 
	SR._lose_subreadings();
},

/** Reverse the prepare operation by returning the necessary subreadings and offset readings
 */
unprepare_for_operation: function () {
	//first run find_subreadings so that the offset subreadings that were made 
	//main readings in prepare are put back as subreadings (if they still match their offset record)
	SR._lose_subreadings();
	SR._find_subreadings(); //this looks like the breaking point
	//then if we aren't looking at subreadings hide them again
	if (CL._show_subreadings === false) {
		SR._lose_subreadings();
	}           
},

/** This is used in preparing for operations to put all offset subreadings back as main readings.
 * This is important because 
 * a) we do not want to have to faff with subreadings during combine and split operations
 * b) We cannot just subsume them into parents as with other subreadings because they need to become main readings if their unit extent changes.
 * */
//TODO:make this work for the new combined_gap_standoff subreadings
_remove_offset_subreadings: function (unit_details) {
	var data, key, id_key, apparatus, unit, type, temp, readings, parent, i, j, k, l, sr, app_string, subreading_id, row_num, make_main_ids, make_main_ids_list;
	//need to lose subreadings first as for some reason running find subreadings when they are already found looses witnesses
	//if you fix that bug you can stop running _lose_subreadings first. You always need to find them because the rest of the function works on the basis they are there
	SR._lose_subreadings();
	SR._find_subreadings();      
	data = CL._data;
	for (key in data) {
		if (data.hasOwnProperty(key)) {
			if (key.indexOf('apparatus') !== -1) {
				if (typeof unit_details === 'undefined' || unit_details.app_id === key) {
					apparatus = data[key];
					for (i = 0; i < apparatus.length; i += 1) {
						make_main_ids = {};
						//loop through standoff readings
						for (type in data.marked_readings) {
							if (data.marked_readings.hasOwnProperty(type)) {      
								for (k = 0; k < data.marked_readings[type].length; k += 1) {
									if (data.marked_readings[type][k].apparatus === key) { //if in right apparatus row
										if (typeof unit_details === 'undefined' || unit_details.unit_id === data.marked_readings[type][k].unit_id) {
											if (data.marked_readings[type][k].start ===  apparatus[i].start 
													&& data.marked_readings[type][k].end ===  apparatus[i].end
													&& data.marked_readings[type][k].unit_id === apparatus[i]._id) { //if unit extent is correct
												temp = SV.get_pos_in_unit_set(i, key);

												//we are in the matching unit and all is fine with extents
												//so we can now make the marked reading a main reading again
												//loop through readings until we find one that matches the marked parent    
												readings = apparatus[i].readings;
												//find the parent
												for (j = 0; j < readings.length; j += 1) {
													if (data.marked_readings[type][k].parent_text !== '') {
														if (CL.extract_witness_text(readings[j], {'app_id': key, 'unit_id': apparatus[i]._id}) === data.marked_readings[type][k].parent_text) {
															parent = readings[j];
															row_num = j;
														}
													} else {
														if (readings[j].text.length === 0) {
															if (!data.marked_readings[type][k].hasOwnProperty('om_details') && !readings[j].hasOwnProperty('details')) {
																parent = readings[j];
																row_num = j;
															} else if (readings[j].details === data.marked_readings[type][k].om_details) {
																parent = readings[j];
																row_num = j;
															}
														}
													} 	    
												}
												//Because we are calling _find_subreadings at the start we will always have our readings available as subreadings
												if (parent.hasOwnProperty('subreadings')) {
													//make it a main reading
													if (key === 'apparatus') {
														app_string = '';
													} else {
														app_string = 'app_' + key.replace('apparatus', '') + '_';
													}
													for (sr in readings[row_num].subreadings) {
														if (readings[row_num].subreadings.hasOwnProperty(sr)) {
															if (sr === type) { //this may need to change if we allow chaining here
																for (l = 0; l < readings[row_num].subreadings[sr].length; l += 1) {
																	//TODO: this must be witness specific and only change the target witness - all others must be left alone!
																	if (readings[row_num].subreadings[sr][l].witnesses.indexOf(data.marked_readings[type][k].witness) !== -1) {
																		subreading_id = 'unit_' + i + '_' + app_string + 'row_' + row_num + '_type_' + type + '_subrow_' + l;
																		if (make_main_ids.hasOwnProperty(subreading_id)) {
																			make_main_ids[subreading_id].push(data.marked_readings[type][k].witness);
																		} else {
																			make_main_ids[subreading_id] = [data.marked_readings[type][k].witness];
																		}
																	}
																}
															}
														}
													}
												} else {
													console.log('For some reason we don\'t have any subreadings for the parent we found');
												}
											}
										}
									}
								}
							}
						}
						if (!$.isEmptyObject(make_main_ids)) {
							make_main_ids_list = [];
							for (id_key in make_main_ids) { 
								make_main_ids_list.push(id_key);
							}
							SV.make_main_reading(make_main_ids_list, make_main_ids);
						}
					}
				}
			}
		}
	}
},

_has_regulariser_subreading: function (reading) {
	var i, text;
	text = reading.text;
	for (i = 0; i < text.length; i += 1) {
		if (text[i].hasOwnProperty('regularised')) {
			return true;
		}
	}
	return false;
},

_has_standoff_subreading: function (reading) {
	if (reading.hasOwnProperty('SR_text') || reading.hasOwnProperty('standoff_subreadings')) {
		return true;
	}
	return false;
},

_remove_from_subreading: function (reading, witness) {
	var key, i, j;
	if (reading.hasOwnProperty('subreadings')) {
		for (key in reading.subreadings) {
			if (reading.subreadings.hasOwnProperty(key)) {
				for (i = 0; i < reading.subreadings[key].length; i += 1) {
					if (reading.subreadings[key][i].witnesses.indexOf(witness) !== -1) {
						reading.subreadings[key][i].witnesses.splice(reading.subreadings[key][i].witnesses.indexOf(witness), 1);
						if (reading.subreadings[key][i].witnesses.length === 0) {
							reading.subreadings[key][i] = null;
						} else {
							for (j = 0; j < reading.subreadings[key][i].length; j += 1) {
								delete reading.subreadings[key][i].text[j][witness];
								reading.subreadings[key][i].text[j].reading.splice(reading.subreadings[key][i].text[j].reading.indexOf(witnesses), 1);
							}
						}       			
					}
				}
			}
			CL.remove_null_items(reading.subreadings[key]);
			if (reading.subreadings[key].length === 0) {
				delete reading.subreadings[key];
			}
		}
		if ($.isEmptyObject(reading.subreadings)) {
			delete reading.subreadings;
		}
	}
},

has_combined_gap: function (subreading) {
	var i;
	if (subreading.text.length > 0) {
		if (subreading.text[0].hasOwnProperty('combined_gap_before')) {
			return true;
		}
		if (subreading.text[subreading.text.length-1].hasOwnProperty('combined_gap_after')) {
			return true;
		}
	}
	return false;
},







/** takes a subreading and make it into a main reading
 * the interface value is caculated from the text_string value of the subreading so as long as that is correct
 * we should be okay here! */
make_main_reading: function (id_string, details) {
	var scroll_offset, i, unit_number, app_id, unit, parent_pos, subtype, subreading_pos, parent_reading, subreading, options;
	if ($.isArray(id_string)) {
		//this section deals with making things a main reading in the context of removing the offset marked subreadings from the 
		//field of play in prepare_for_operation()
		//sort by row then type then subrow always working from the bottom to the top
		id_string.sort(SV.subreading_id_sort);
		//send each item on list in turn to CL.make_main_reading(id_string, false); 
		//false stops the standoff record from being deleted
		for (i = 0; i < id_string.length; i += 1) {
			if (id_string[i].indexOf('_app_') === -1) {
				app_id = 'apparatus';
				unit_number = parseInt(id_string[i].substring(id_string[i].indexOf('unit_') + 5, id_string[i].indexOf('_row_'))); 
			} else {
				unit_number = parseInt(id_string[i].substring(id_string[i].indexOf('unit_') + 5, id_string[i].indexOf('_app_')));
				app_id = 'apparatus' + id_string[i].substring(id_string[i].indexOf('_app_') + 5, id_string[i].indexOf('_row_'));
			}
			unit = CL._data[app_id][unit_number];
			subtype = id_string[i].substring(id_string[i].indexOf('_type_') + 6, id_string[i].indexOf('_subrow_'));
			parent_pos = parseInt(id_string[i].substring(id_string[i].indexOf('_row_') + 5, id_string[i].indexOf('_type_')));
			subreading_pos = parseInt(id_string[i].substring(id_string[i].indexOf('_subrow_') + 8));
			parent_reading = unit.readings[parent_pos];
			subreading = parent_reading.subreadings[subtype][subreading_pos];
			options = {'delete_offset': false, 'witnesses': details[id_string[i]]};
			CL.make_main_reading(unit, parent_reading, subtype, subreading_pos, options);
		}
	} else {
		//this section is a top level action called from the context menu so must be prepared to a certain extent
		scroll_offset = [document.getElementById('scroller').scrollLeft, 
		                 document.getElementById('scroller').scrollTop];
		SV.add_to_undo_stack(CL._data);

		if (id_string.indexOf('_app_') === -1) {
			app_id = 'apparatus';
			unit_number = parseInt(id_string.substring(id_string.indexOf('unit_') + 5, id_string.indexOf('_row_'))); 
		} else {
			unit_number = parseInt(id_string.substring(id_string.indexOf('unit_') + 5, id_string.indexOf('_app_')));
			app_id = 'apparatus' + id_string.substring(id_string.indexOf('_app_') + 5, id_string.indexOf('_row_'));
		}
		unit = CL._data[app_id][unit_number];
		subtype = id_string.substring(id_string.indexOf('_type_') + 6, id_string.indexOf('_subrow_'));
		parent_pos = parseInt(id_string.substring(id_string.indexOf('_row_') + 5, id_string.indexOf('_type_')));
		subreading_pos = parseInt(id_string.substring(id_string.indexOf('_subrow_') + 8));
		parent_reading = unit.readings[parent_pos];
		subreading = parent_reading.subreadings[subtype][subreading_pos];
		options = {'delete_offset': true};
		CL.make_main_reading(unit, parent_reading, subtype, subreading_pos, options);
		//Need to prepare for unsplitting but not for make_main_reading
		SV.prepare_for_operation();
		SV.unsplit_unit_witnesses(unit_number, app_id);
		SV.unprepare_for_operation();
		SV.check_bug_status('make main reading', id_string);
		SV.show_set_variants_data();
		document.getElementById('scroller').scrollLeft = scroll_offset[0];
		document.getElementById('scroller').scrollTop = scroll_offset[1];
	}
},

/* This is used for marking how any duplicate (because of overlapping reading) should be flagged
 * options at the moment are 'deleted' and 'overlapped'*/
//TODO: this could be simpler if we just have a reading pointer!
add_reading_flag: function (reading_details, flag) {
	var scroll_offset;
	scroll_offset = [document.getElementById('scroller').scrollLeft, 
	                 document.getElementById('scroller').scrollTop];
	SV.add_to_undo_stack(CL._data);
	//now add the flag and set to true
	CL._data[reading_details[1]][reading_details[0]].readings[reading_details[2]].overlap_status = flag;
	CL._data[reading_details[1]][reading_details[0]].readings[reading_details[2]].text = [];
	CL._data[reading_details[1]][reading_details[0]].readings[reading_details[2]].witnesses = CL.get_all_reading_witnesses(CL._data[reading_details[1]][reading_details[0]].readings[reading_details[2]]);
	delete CL._data[reading_details[1]][reading_details[0]].readings[reading_details[2]].combined_gap_before_subreadings;
	delete CL._data[reading_details[1]][reading_details[0]].readings[reading_details[2]].combined_gap_before_subreadings_details;
	delete CL._data[reading_details[1]][reading_details[0]].readings[reading_details[2]].combined_gap_after_subreadings;
	delete CL._data[reading_details[1]][reading_details[0]].readings[reading_details[2]].subreadings;
	delete CL._data[reading_details[1]][reading_details[0]].readings[reading_details[2]].SR_text;
	delete CL._data[reading_details[1]][reading_details[0]].readings[reading_details[2]].type;
	delete CL._data[reading_details[1]][reading_details[0]].readings[reading_details[2]].details;
	SV.show_set_variants_data();
	document.getElementById('scroller').scrollLeft = scroll_offset[0];
	document.getElementById('scroller').scrollTop = scroll_offset[1];
},

remove_reading_flag: function (reading_details) {
	var scroll_offset;
	scroll_offset = [document.getElementById('scroller').scrollLeft, 
	                 document.getElementById('scroller').scrollTop];
	SV.add_to_undo_stack(CL._data);
	delete CL._data[reading_details[1]][reading_details[0]].readings[reading_details[2]].overlap_status;
	SV.unsplit_unit_witnesses(reading_details[0], reading_details[1]);
	SV.show_set_variants_data();
	document.getElementById('scroller').scrollLeft = scroll_offset[0];
	document.getElementById('scroller').scrollTop = scroll_offset[1];
},


make_standoff_reading: function (type, reading_details, parent_reading) {
	var scroll_offset;
	scroll_offset = [document.getElementById('scroller').scrollLeft, 
	                 document.getElementById('scroller').scrollTop];
	SV.add_to_undo_stack(CL._data);
	CL.make_standoff_reading(type, reading_details, parent_reading);
	SV.check_bug_status('make offset reading', 'of type ' + type + ' in apparatus unit ' + reading_details.unit_pos + ' of reading ' + reading_details.reading_pos + ' as a subreading of ' + parent_reading + '.');
	SV.show_set_variants_data();
	document.getElementById('scroller').scrollLeft = scroll_offset[0];
	document.getElementById('scroller').scrollTop = scroll_offset[1];
},

subreading_id_sort: function (a, b) {
	var rowa, rowb, typea, typeb, subrowa, subrowb;
	//row first
	rowa = parseInt(a.substring(a.indexOf('_row_') + 5, a.indexOf('_type_')));
	rowb = parseInt(b.substring(b.indexOf('_row_') + 5, b.indexOf('_type_')));
	if (rowa !== rowb) {
		return rowb - rowa;
	}
	//then type
	typea = a.substring(a.indexOf('_type_') + 6, a.indexOf('_subrow_'));
	typeb = b.substring(b.indexOf('_type_') + 6, b.indexOf('_subrow_'));
	if (typea !== typeb) {
		return a < b ? -1: 1;
	}
	//then subrow
	subrowa = parseInt(a.substring(a.indexOf('_subrow_') + 8));
	subrowb = parseInt(b.substring(b.indexOf('_subrow_') + 8));
	if (subrowa !== subrowb) {
		return subrowb - subrowa;
	}
},    


/** The next three functions are concerned with the context menu and associated event handling */

/** creates context menu for right clicked on element
 * unit, overlap_unit, subreading and split_duplicate_unit are straight hard coded menus
 * the others are determined from project configuration
 *  */
make_menu: function (menu_name) {
	var menu, i, key, subreadings, SV_rules;           
	//menus for full units
	if (menu_name === 'unit') {
		document.getElementById('context_menu').innerHTML = '<li id="split_words"><span>Split words</span></li><li id="split_readings"><span>Split readings</span></li>';
	} else if (menu_name === 'overlap_unit') {
		document.getElementById('context_menu').innerHTML = '<li id="split_readings"><span>Split readings</span></li>';
	} else if (menu_name === 'subreading') {
		document.getElementById('context_menu').innerHTML = '<li id="make_main_reading"><span>Make main reading</span></li>';
	} else if (menu_name === 'split_duplicate_unit') {
		menu = ['<li id="treat_as_main"><span>Make main reading</span></li>'];
		for (i = 0; i < CL._overlapped_options.length; i += 1) {
			menu.push('<li id="' + CL._overlapped_options[i].id + '"><span>' + CL._overlapped_options[i].label + '</span></li>')
		}        	
		document.getElementById('context_menu').innerHTML = menu.join('');
	} else {
		menu = [];
		menu.push('<li id="recombine_readings"><span>Recombine</span></li>');
		if (menu_name === 'split_unit' || menu_name === 'split_unit_a' ) {
			menu.push('<li id="overlap"><span>Overlap</span></li>');
		}
		if (menu_name === 'split_unit' || menu_name === 'split_unit_a' || menu_name === 'overlap_split_unit') {
			menu.push('<li id="split_witnesses"><span>Split Witnesses</span></li>');
		}
		if (menu_name === 'split_unit' || menu_name === 'split_omlac_unit' || menu_name === 'overlap_split_unit') {
			SV_rules = CL._get_rule_classes('create_in_SV', true, 'name', ['subreading', 'value', 'identifier', 'keep_as_main_reading']);
			subreadings = [];
			for (key in SV_rules) {
				if (SV_rules.hasOwnProperty(key)) {
					if (SV_rules[key][0]) {
						subreadings.push([key,  SV_rules[key][1],  SV_rules[key][2]]);
					} else if (SV_rules[key][3]) {
						menu.push('<li id="mark_as_' + SV_rules[key][1] + '"><span>Mark/Unmark as ' + key + '</span></li>');
					} else {
						menu.push('<li id="mark_as_' + SV_rules[key][1] + '"><span>Mark as ' + key + '</span></li>');
					}
				}
			}
			if (subreadings.length === 1) {
				if (typeof subreadings[0][2] !== 'undefined') {
					menu.push('<li id="mark_as_' + subreadings[0][1] + '"><span>Mark as ' + subreadings[0][0] + ' (' + subreadings[0][2] + ')</span></li>');
				} else {
					menu.push('<li id="mark_as_' + subreadings[0][1] + '"><span>Mark as ' + subreadings[0][0] + '</span></li>');
				}
			} else if (subreadings.length > 1) {
				menu.push('<li id="mark_as_SVsubreading"><span>Mark as subreading</span></li>');
			}
		}
		document.getElementById('context_menu').innerHTML = menu.join('');
	}
	SV._add_CM_Handlers();
	return 'context_menu';
},

/**adds events for context menu */
_add_CM_Handlers: function () {
	var i, SV_errors, SV_rules, key;
	if (document.getElementById('split_words')) {
		$('#split_words').off('click.swd_c');
		$('#split_words').off('mouseover.swd_mo');
		$('#split_words').on('click.swd_c', function(event) {
			var element, div, unit_number;
			element = SimpleContextMenu._target_element;
			div = CL._get_specified_ancestor(element, 'DIV', function (e) { if ($(e).hasClass('spanlike')) {return false;} return true;});
			unit_number = div.id.replace('drag_unit_', '');
			SV.split_unit(unit_number);
		});
		$('#split_words').on('mouseover.swd_mo', function(event) {CL.hide_tooltip();});
	}
	if (document.getElementById('split_readings')) {
		$('#split_readings').off('click.sr_c');
		$('#split_readings').off('mouseover.sr_mo');
		$('#split_readings').on('click.sr_c', function(event) {
			var element, div, rdg_details;
			element = SimpleContextMenu._target_element;
			div = CL._get_specified_ancestor(element, 'DIV', function (e) { if ($(e).hasClass('spanlike')) {return false;} return true;});
			rdg_details = CL.get_unit_app_reading(div.id);
			SV.split_readings(rdg_details);
		});
		$('#split_readings').on('mouseover.sr_mo', function(event) {CL.hide_tooltip();});  
	}
	if (document.getElementById('make_main_reading')) {
		$('#make_main_reading').off('click.mmr_c');
		$('#make_main_reading').off('mouseover.mmr_mo');
		$('#make_main_reading').on('click.mmr_c', function(event) {
			var element, li, id_string;
			element = SimpleContextMenu._target_element;
			li = CL._get_specified_ancestor(element, 'LI');
			id_string = li.id.replace('subreading_', '');
			SV.make_main_reading(id_string);
		});
		$('#make_main_reading').on('mouseover.mmr_mo', function(event) {CL.hide_tooltip();});
	}
	if (document.getElementById('recombine_readings')) {
		$('#recombine_readings').off('click.rr_c');
		$('#recombine_readings').off('mouseover.rr_mo');
		$('#recombine_readings').on('click.rr_c', function(event) {
			var element, div, rdg_details;
			element = SimpleContextMenu._target_element;
			div = CL._get_specified_ancestor(element, 'DIV', function (e) { if ($(e).hasClass('spanlike')) {return false;} return true;});
			rdg_details = CL.get_unit_app_reading(div.id)
			SV.unsplit_readings(rdg_details);	
		});
		$('#recombine_readings').on('mouseover.rr_mo', function(event) {CL.hide_tooltip();});        	
	}
	if (document.getElementById('overlap')) {
		$('#overlap').off('click.or_c');
		$('#overlap').off('mouseover.or_mo');
		$('#overlap').on('click.or_c', function(event) {
			var element, div, reading_details;
			element = SimpleContextMenu._target_element;
			div = CL._get_specified_ancestor(element, 'DIV', function (e) { if ($(e).hasClass('spanlike')) {return false;} return true;});
			reading_details = CL.get_unit_app_reading(div.id);                           
			SV.overlap_reading(reading_details[0], reading_details[2], {'top': SimpleContextMenu._menuElement.style.top, 'left': SimpleContextMenu._menuElement.style.left});
		});
		$('#overlap').on('mouseover.or_mo', function(event) {CL.hide_tooltip();});
	}
	if (document.getElementById('split_witnesses')) {
		$('#split_witnesses').off('click.sw_c');
		$('#split_witnesses').off('mouseover.sw_mo');
		$('#split_witnesses').on('click.sw_c', function(event) {
			var element, div, reading_details;
			element = SimpleContextMenu._target_element;
			div = CL._get_specified_ancestor(element, 'DIV', function (e) { if ($(e).hasClass('spanlike')) {return false;} return true;});
			reading_details = CL.get_unit_app_reading(div.id);
			SV.split_reading_witnesses(reading_details, 'set_variants', {'top': SimpleContextMenu._menuElement.style.top, 'left': SimpleContextMenu._menuElement.style.left});
		});
		$('#split_witnesses').on('mouseover.sw_mo', function(event) {CL.hide_tooltip();});
	}
	// next if and for deal with overlapped options
	if (document.getElementById('treat_as_main')) {
		$('#treat_as_main').off('click.tam_c');
		$('#treat_as_main').off('mouseover.tam_mo');
		$('#treat_as_main').on('click.tam_c', function(event) {
			var element, div, reading_details;
			element = SimpleContextMenu._target_element;
			div = CL._get_specified_ancestor(element, 'DIV', function (e) { if ($(e).hasClass('spanlike')) {return false;} return true;});
			reading_details = CL.get_unit_app_reading(div.id);
			SV.remove_reading_flag(reading_details);               		
		});
		$('#treat_as_main').on('mouseover.tam_mo', function(event) {CL.hide_tooltip();});        	
	}
	for (i = 0; i < CL._overlapped_options.length; i += 1) {
		if (document.getElementById(CL._overlapped_options[i].id)) {
			SV.add_overlapped_event(CL._overlapped_options[i].id, CL._overlapped_options[i].reading_flag);
		}
	}
	//special added for SV
	SV_rules = CL._get_rule_classes('create_in_SV', true, 'name', ['subreading', 'value', 'identifier', 'keep_as_main_reading']);
	//this deals with all non-genuine subreadings which will always have their own entry in the context menu (!SV_rules[key][0])
	for (key in SV_rules) {       	
		if (SV_rules.hasOwnProperty(key)) {
			if (!SV_rules[key][0]) { 
				if (document.getElementById('mark_as_' + SV_rules[key][1])) {
					//add event decides if its a keep as main reading or not and adds correct handler
					SV.add_event(SV_rules, key);
				}
			}
		}
	}
	//if there is a generic SVsubreading entry in the context menu then we deal with the distinction in a drop down
	if (document.getElementById('mark_as_SVsubreading')) {
		//make menu for mark_as_SVsubreading
		key = 'SVsubreading';
		//SV.add_event(SV_rules, key); this used to be activated but I can't see that it ever worked. It is fine without it
		$('#mark_as_' + key).off('click.' + key + '_c');
		$('#mark_as_' + key).off('mouseover.' + key + '_mo');
		$('#mark_as_' + key).on('click.' + key + '_c', function(event) {
			var element, div, unit,  app_id, unit_pos, rdg_details, reading_pos, reading, reading_details;
			element = SimpleContextMenu._target_element;
			div = CL._get_specified_ancestor(element, 'DIV', function (e) { if ($(e).hasClass('spanlike')) {return false;} return true;});
			rdg_details = CL.get_unit_app_reading(div.id);
			unit_pos = rdg_details[0];
			app_id = rdg_details[1];
			reading_pos = rdg_details[2];
			unit = CL._data[app_id][unit_pos];
			reading = unit.readings[reading_pos];
			reading_details = {'app_id': app_id, 'unit_id': unit._id, 'unit_pos': unit_pos, 'reading_pos': reading_pos, 'reading_id': reading._id};
			CL.mark_standoff_reading(key, 'Subreading', reading_details, 'set_variants', {'top': SimpleContextMenu._menuElement.style.top, 'left': SimpleContextMenu._menuElement.style.left});
		});
		$('#mark_as_' + key).on('mouseover.' + key + '_mo', function(event) {CL.hide_tooltip();});      	
	} else {
		for (key in SV_rules) {
			if (SV_rules.hasOwnProperty(key)) {
				if (SV_rules[key][0]) { //if this is a subreading (hence dealt with as subreading in menu)
					if (document.getElementById('mark_as_' + SV_rules[key][1])) {
						SV.add_event(SV_rules, key);
					}
				} 
			}
		}
	}
},

add_overlapped_event: function (id, flag) {
	$('#' + id).off('click.' + id + '_c');
	$('#' + id).off('mouseover.' + id + '_mo');
	$('#' + id).on('click.' + id + '_c', function(event) {
		var element, div, reading_details;
		element = SimpleContextMenu._target_element;
		div = CL._get_specified_ancestor(element, 'DIV', function (e) { if ($(e).hasClass('spanlike')) {return false;} return true;});
		reading_details = CL.get_unit_app_reading(div.id);
		SV.add_reading_flag(reading_details, flag);
	});
	$('#' + id).on('mouseover.' + id + '_mo', function(event) {CL.hide_tooltip();}); 
},

/**adds the correct handler depending on subreading and keep_as_main_reading settings in the project rule configurations */
add_event: function (SV_rules, key) {
	//if this reading is not marked to be kept as a main reading then use stand_off marking
	if (!SV_rules[key][3]) {
		$('#mark_as_' + SV_rules[key][1]).off('click.' + key + '_c');
		$('#mark_as_' + SV_rules[key][1]).off('mouseover.' + key + '_mo');
		$('#mark_as_' + SV_rules[key][1]).on('click.' + key + '_c', function(event) {
			var element, div, rdg_details, unit, unit_pos, reading_pos, reading, reading_details, app_id;
			element = SimpleContextMenu._target_element;
			div = CL._get_specified_ancestor(element, 'DIV', function (e) { if ($(e).hasClass('spanlike')) {return false;} return true;});
			rdg_details = CL.get_unit_app_reading(div.id);
			unit_pos = rdg_details[0];
			app_id = rdg_details[1];
			reading_pos = rdg_details[2];
			unit = CL._data[app_id][unit_pos]
			reading = unit.readings[reading_pos];
			reading_details = {'app_id': app_id, 'unit_id': unit._id, 'unit_pos': unit_pos, 'reading_pos': reading_pos, 'reading_id': reading._id};     	    
			CL.mark_standoff_reading(SV_rules[key][1], key, reading_details, 'set_variants', {'top': SimpleContextMenu._menuElement.style.top, 'left': SimpleContextMenu._menuElement.style.left});       	    
		});
		$('#mark_as_' + SV_rules[key][1]).on('mouseover.' + key + '_mo', function(event) {CL.hide_tooltip();});
	} else {
		//else just add the marker and allow its removal
		$('#mark_as_' + SV_rules[key][1]).off('click.' + key + '_c');
		$('#mark_as_' + SV_rules[key][1]).off('mouseover.' + key + '_mo');
		$('#mark_as_' + SV_rules[key][1]).on('click.' + key + '_c', function(event) {
			var element, div, rdg_details, reading_pos, reading, app_id, unit_pos;
			element = SimpleContextMenu._target_element;
			div = CL._get_specified_ancestor(element, 'DIV', function (e) { if ($(e).hasClass('spanlike')) {return false;} return true;});
			rdg_details = CL.get_unit_app_reading(div.id);
			unit_pos = rdg_details[0];
			app_id = rdg_details[1];
			reading_pos = rdg_details[2];
			reading = CL._data[app_id][unit_pos].readings[reading_pos];
			SV.mark_reading(SV_rules[key][1], reading);
		});
		$('#mark_as_' + SV_rules[key][1]).on('mouseover.' + key + '_mo', function(event) {CL.hide_tooltip();});
	}
},

mark_reading: function (value, reading) {
	var scroll_offset;
	scroll_offset = [document.getElementById('scroller').scrollLeft, 
	                 document.getElementById('scroller').scrollTop];
	CL.mark_reading(value, reading);
	SV.show_set_variants_data();
	document.getElementById('scroller').scrollLeft = scroll_offset[0];
	document.getElementById('scroller').scrollTop = scroll_offset[1];
},


/** next two functions allow undo operation. */


/** Length of undo stack is determined by SV.undo_stack_length variable.
 * Not all operations lead to a new entry on the stack only those that really 
 * change the object so split readings and recombine readings for example
 * don't get added to the stack. Functions that are considered important enough to 
 * be undone call SV.add_to_undo_stack before making the object changes.*/
add_to_undo_stack: function (data) {
	if (SV._undo_stack.length === SV._undo_stack_length) {
		SV._undo_stack.shift();
	}
	SV._undo_stack.push(JSON.stringify(data));
},

undo: function () {
	var i, event_list, scroll_offset;
	if (SV._undo_stack.length > 0) {
		scroll_offset = [document.getElementById('scroller').scrollLeft, 
		                 document.getElementById('scroller').scrollTop];
		event_list = CL._data.event_list;
		CL._data = JSON.parse(SV._undo_stack.pop());
		CL._data.event_list = event_list;
		SV.remove_splits();
		if (CL._show_subreadings=== true) {
			SR._find_subreadings();
		}
		SV.check_bug_status('undo', 'last action recorded');
		SV.show_set_variants_data();
		document.getElementById('scroller').scrollLeft = scroll_offset[0];
		document.getElementById('scroller').scrollTop = scroll_offset[1];
	}
},

remove_splits: function () {
	var i, key;
	for (key in CL._data) {
		if (CL._data.hasOwnProperty(key)) {
			for (i = 0; i < CL._data[key].length; i +=1 ) {
				if (CL._data[key][i].hasOwnProperty('split_readings')) {
					delete CL._data[key][i].split_readings;
					SV.unsplit_unit_witnesses(i, 'apparatus');
				}
			}
		}
	} 
},

check_tn_presence: function () {
	var i, j, k, l, m, key;
	for (i = 0; i < CL._data.apparatus.length; i += 1) {
		for (j = 0; j < CL._data.apparatus[i].readings.length; j += 1) {
			if (CL._data.apparatus[i].readings[j].hasOwnProperty('subreadings')) {
				for (key in CL._data.apparatus[i].readings[j]['subreadings']) {
					for (k = 0; k < CL._data.apparatus[i].readings[j]['subreadings'][key].length; k += 1) {
						for (l = 0; l < CL._data.apparatus[i].readings[j]['subreadings'][key][l]; l += 1) {
							for (m = 0; m < CL._data.apparatus[i].readings[j]['subreadings'][key][l].text.length; m += 1) {
								if (CL._data.apparatus[i].readings[j]['subreadings'][key][l].text[m].hasOwnProperty('t')) {
									return [true, 'there is a rogue t in word ' + m + ' in subreading ' + l + ' of the ' + key + ' subreadings of reading ' + j +  ' of apparatus unit ' + i]; 
								}
								if (CL._data.apparatus[i].readings[j]['subreadings'][key][l].text[m].hasOwnProperty('n')) {
									return [true, 'there is a rogue n in word ' + m + ' in subreading ' + l + ' of the ' + key + ' subreadings of reading ' + j +  ' of apparatus unit ' + i]; 
								}
							}
						}
					}
				}
			}
			for (k = 0; k < CL._data.apparatus[i].readings[j].text.length; k += 1) {
				if (CL._data.apparatus[i].readings[j].text[k].hasOwnProperty('t')) {
					return [true, 'there is a rogue t in word ' + k + ' in reading ' + j + ' of apparatus unit ' + i];
				}
				if (CL._data.apparatus[i].readings[j].text[k].hasOwnProperty('n')) {
					return [true, 'there is a rogue n in word ' + k + ' in reading ' + j + ' of apparatus unit ' + i];
				}
			}  
		}
	}
	return [false];
},

check_ids: function () {
	var key, i, j;
	for (key in CL._data) {
		if (key.indexOf('apparatus') !== -1) {
			for (i = 0; i < CL._data[key].length; i += 1) {
				if (!CL._data[key][i].hasOwnProperty('_id')) {
					return [true, ' there is no id on unit ' + i + ' in ' + key];
				}
				for (j = 0; j < CL._data[key][i].readings.length; j += 1) {
					if (!CL._data[key][i].readings[j].hasOwnProperty('_id')) {
						return [true, ' there is no id on reading ' + j + ' in unit ' + i + ' in ' + key];
					}
				}
			}
		}
	}
	return [false];
},

/** My bug self reporting system attempt! */
check_bug_status: function (action, details) {
	var index_problem, witness_problem, bug_report, i, newwindow1, tmp, sigla_problem, standoff_problem, 
	tn_check, id_problem;
	if (!CL._data.hasOwnProperty('event_list')) {
		CL._data.event_list = [];
	}
	//first log the event in the list
	CL._data.event_list.push(action + ' ' + details);
	//then check the event didn't cause a recognised data issue
	index_problem = SV.check_indexes_present();
	witness_problem = SV.check_unique_witnesses();
	sigla_problem = SV.check_sigla_problems();
	standoff_problem = SV.check_standoff_reading_problems();
	tn_check = SV.check_tn_presence();
	id_problem = SV.check_ids();
	//if it does then prepare a bug report
	if (index_problem[0] || witness_problem[0] || sigla_problem[0] || standoff_problem[0] || tn_check[0] || id_problem[0]) {
		bug_report = [];
		bug_report.push(CL._context + '\n')
		for (i = 0; i < CL._data.event_list.length; i += 1) {
			bug_report.push(CL._data.event_list[i]);
		}
		if (index_problem[0]) {
			bug_report.push(index_problem[1]);
		}
		if (witness_problem[0]) {
			bug_report.push(witness_problem[1]);
		}
		if (sigla_problem[0]) {
			bug_report.push(sigla_problem[1]);
		}
		if (standoff_problem[0]) {
			bug_report.push(standoff_problem[1]);
		}
		if (tn_check[0]) {
			bug_report.push(tn_check[1]);
		}
		if (id_problem[0]) {
			bug_report.push(id_problem[1]);
		}
		alert('A problem has occurred.\nA bug report will open in a new window.\nPlease copy all text in the window and email it to Cat.')
		newwindow1 = open('','name','height=400,width=400,scrollbars=yes');
		newwindow1.focus();
		tmp = newwindow1.document.body;
		tmp.innerHTML = bug_report.join('<br/>');
	}
},


//this function checks that each instance of SR_text or standoff_subreadings 
//has a corresponding entry in the marked_readings object
check_standoff_reading_problems: function () {
	var key, i, j, k, unit, reading, witness, result;
	for (key in CL._data) {
		if (CL._data.hasOwnProperty(key)) {
			if (key.match(/apparatus\d*/g) !== null) {
				for (i = 0; i < CL._data[key].length; i += 1) {
					unit = CL._data[key][i];
					for (j = 0; j < unit.readings.length; j += 1) {
						reading = unit.readings[j];
						if (reading.hasOwnProperty('SR_text') || reading.hasOwnProperty('standoff_subreadings')) {
							if (reading.hasOwnProperty('SR_text')) {
								for (witness in reading.SR_text) {
									if (reading.SR_text.hasOwnProperty(witness)) {
										result = SV.check_for_standoff_reading(witness, unit);
										if (result === false) {
											return [true, witness + ' has SR_text in the unit starting at ' + unit.start + ' and ending at ' + unit.end + ' and there is no corresponding marked reading entry.'];
										}
									}
								}
							}
							if (reading.hasOwnProperty('standoff_subreadings')) {
								for (k = 0; k < reading.standoff_subreadings.length; k += 1) {
									result = SV.check_for_standoff_reading(reading.standoff_subreadings[k], unit);
									if (result === false) {
										return [true, reading.standoff_subreadings[k] + ' has standoff_subreadings in the unit starting at ' + unit.start + ' and ending at ' + unit.end + ' and there is no corresponding marked reading entry.'];
									}
								}
							}
						}
					}
				}
			}
		}
	}
	return [false];
},

check_for_standoff_reading: function (witness, unit) {
	var type, i;
	if (CL._data.hasOwnProperty('marked_readings')) {
		for (type in CL._data.marked_readings) {
			if (CL._data.marked_readings.hasOwnProperty(type)) {
				for (i = 0; i < CL._data.marked_readings[type].length; i += 1) {
					if (CL._data.marked_readings[type][i].start === unit.start && CL._data.marked_readings[type][i].end === unit.end) {
						if (CL._data.marked_readings[type][i].witness === witness) {
							return true;
						}
					}
				}
			}
		}
	}
	return false;
},

check_sigla_problems: function () {
	var key, i, j, k, unit, reading;
	for (key in CL._data) {
		if (CL._data.hasOwnProperty(key)) {
			if (key.match(/apparatus\d*/g) !== null) {
				for (i = 0; i < CL._data[key].length; i += 1) {
					unit = CL._data[key][i];
					for (j = 0; j < unit.readings.length; j += 1) {
						reading = unit.readings[j];
						for (k = 0; k < reading.text.length; k += 1) {
							if (reading.text[k].hasOwnProperty('siglum')) {
								return [true, 'word ' + k + ' in reading ' + j  + ' in ' + key + ' in unit ' + i + 'has been given a siglum list']
							}
						}
					}
				}
			}
		}
	}
	return [false];
},

/** a method for finding and maybe reporting bugs with combining and splitting */
check_indexes_present: function () {
	var key, i, j, k, unit, reading, word;
	for (key in CL._data) {
		if (CL._data.hasOwnProperty(key)) {
			if (key.match(/apparatus\d*/g) !== null) {
				for (i = 0; i < CL._data[key].length; i += 1) {
					unit = CL._data[key][i];
					for (j = 0; j < unit.readings.length; j += 1) {
						reading = unit.readings[j];
						for (k = 0; k < reading.text.length; k += 1) {
							word = reading.text[k];
							if (!word.hasOwnProperty('index') || typeof word.index === 'undefined') {
								return [true, 'error with word ' + k + ' in reading ' + j + ' in ' + key + ' in unit ' + i];
							}
						}
					}
				}
			}
		}
	}
	return [false];
},

check_unique_witnesses: function () {
	var key, i, j, k, unit, reading, word, wit_check;
	for (key in CL._data) {
		if (CL._data.hasOwnProperty(key)) {
			if (key.match(/apparatus\d*/g) !== null) {
				for (i = 0; i < CL._data[key].length; i += 1) {
					unit = CL._data[key][i];
					wit_check = [];
					for (j = 0; j < unit.readings.length; j += 1) {
						reading = unit.readings[j];
						for (k = 0; k < reading.witnesses.length; k += 1) {
							if (wit_check.indexOf(reading.witnesses[k]) === -1) {
								wit_check.push(reading.witnesses[k]);
							} else {
								return [true, 'witnesses ' + reading.witnesses[k] + 'dupicated in  ' + key + ' in unit ' + i];
							}
						}
					}
				}
			}
		}
	}
	return [false];
},

are_all_units_complete: function () {
	var i, key, total_required, witnesses, j, total_sigla;
	total_required = 0;
	total_sigla = [];
	for (key in CL._data['hand_id_map']) {
		if (CL._data['hand_id_map'].hasOwnProperty(key)) {
			total_required += 1;
			total_sigla.push(key);
		}
	}
	for (i = 0; i < CL._data.apparatus.length; i += 1) {
		witnesses = CL.get_all_unit_witnesses(CL._data.apparatus[i]);
		if (witnesses.length !== total_required) {
			for (j = 0; j < witnesses.length; j += 1) {
				if (total_sigla.indexOf(witnesses[j]) === -1) {
					console.log('extra witness ' + witnesses[j] )
				} else {
					total_sigla[total_sigla.indexOf(witnesses[j])] = null;
				}
			}
			console.log('witnesses missing in unit ' + i);
			return false;
		}
	}
	return true;
},

	};
}());
