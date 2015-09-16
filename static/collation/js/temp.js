        show_reorder_readings: function (options) {
            var html, i, highest_unit, header, triangles, row, label, key, overlaps, app_ids, footer_html,
                num, temp, event_rows, scroll_offset, overlap_options, new_overlap_options, container,
                undo_button;
            console.log(CL._data);
            OR.add_labels(false);
            if (typeof options === 'undefined') {
        	options = {};
            }
            //make sure we have a container to put things in
            if (!options.hasOwnProperty('container') || options.container === null) {
                container = document.getElementsByTagName('body')[0];
            } else {
        	container = options.container;
            }
            //sort out options and get layout
            if (!options.hasOwnProperty('highlighted_wit') && CL._highlighted !== 'none') {
        	options.highlighted_wit = CL._highlighted;
            }
            //attach right click menus
            SimpleContextMenu.setup({'preventDefault' : true, 'preventForms' : false});
            SimpleContextMenu.attach('main_reading', function () {return OR.make_menu('main_reading')});
            SimpleContextMenu.attach('overlap_main_reading', function () {return OR.make_menu('overlap_main_reading')});
            SimpleContextMenu.attach('subreading', function () {return OR.make_menu('subreading')});
            SimpleContextMenu.attach('overlap_unit', function () {return OR.make_menu('overlap_unit')});
            SimpleContextMenu.attach('reading_label', function () {return OR.make_menu('reading_label')});
            temp = CL.get_unit_layout(CL._data.apparatus, 1, 'reorder', options);
            header = CL.get_collation_header(CL._data, temp[1], false);
            html = header[0];
            highest_unit = header[1];
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
                overlaps = CL.get_overlap_layout(CL._data[app_ids[i]], num, 'reorder', header[1], new_overlap_options);
                html.push.apply(html, overlaps[0]);
                temp[2].push.apply(temp[2], overlaps[1]);
            }
            html.push('<ul id="context_menu" class="SimpleContextMenu"></ul>');
            document.getElementById('header').innerHTML = CL.get_header_html('Order Readings', CL._context);
            CL._services.show_login_status();
            document.getElementById('header').className = 'reorder_header';
            container.innerHTML = '<div id="scroller" class="fillPage"><table class="collation_overview">'
                + html.join('') + '</table></div><div id="single_witness_reading"></div>';
            CL.expandFillPageClients();
//            document.getElementById('scroller').style.height =
//                window.innerHeight - document.getElementById('footer').offsetHeight
//                - document.getElementById('header').offsetHeight - 40 + 'px';
            if (OR._undo_stack.length > 0) {
            	undo_button = '<input type="button" id="undo_button" value="undo"/>';
            } else {
            	undo_button = '';
            }
            //sort out footer stuff
            footer_html = [];
            footer_html.push('<input id="expand_collapse_button" type="button" value="collapse all"/>');
            footer_html.push('<input id="show_hide_subreadings_button" type=button value="show non-edition subreadings"/>');
            footer_html.push('<span id="stage_links"></span>');
            footer_html.push(undo_button);
            footer_html.push('<select id="highlighted" name="highlighted"></select>');
            footer_html.push('<input id="save" type=button value="Save"/>');
            if (CL._managing_editor === true) {
        	footer_html.push('<input id="approve" type="button" value="Approve"/>');
            }
            document.getElementById('footer').innerHTML = footer_html.join('');
            CL.add_stage_links();
            SPN.remove_loading_overlay();
            CL.add_triangle_functions('table');
            U.FORMS.populate_select(SV.get_hands_and_sigla(), document.getElementById('highlighted'), 'document', 'hand', options.highlighted_wit);
            $('#highlighted').on('change', function (event) {OR.highlight_witness(event.target.value);});
            if (document.getElementById('save')) {
        	$('#save').on('click', function (event) {CL.save_collation('ordered');});
            }
            CL.add_subreading_events('reorder', CL._get_rule_classes('subreading', true, 'value', ['identifier', 'subreading']));
            if (document.getElementById('approve')) {
        	$('#approve').on('click', function (event) {
        	    OR.order_witnesses_for_output();
                    CL.save_collation('approved');
                    CL.export_to_apparatusEditor();
                });
            }
            for (i = 0; i < highest_unit; i += 1) {
                if (document.getElementById('drag_unit_' + i) !== null) {
                    OR.redips_init_reorder('drag_unit_' + i);
                }
            }
            for (key in CL._data) {
                if (CL._data.hasOwnProperty(key)) {
                    if (key.match(/apparatus\d/g) !== null) {
                        for (i = 0; i < CL._data[key].length; i += 1) {
                            if (document.getElementById('drag_unit_' + i + '_app_' + key.replace('apparatus', '')) !== null) {
                                OR.redips_init_reorder('drag_unit_' + i + '_app_' + key.replace('apparatus', ''));
                            }
                        }
                    }
                }
            }
            if (document.getElementById('undo_button')) {
        	$('#undo_button').on('click', function (event) {
            	    SPN.show_loading_overlay();
            	    OR.undo();
            	});
            }

	    CL.make_verse_links();

            event_rows = temp[2];
            for (i = 0; i < event_rows.length; i += 1) {
                row = document.getElementById(event_rows[i]);
                if (row !== null) {
                    CL._add_hover_events(row);
                }
            }
        },