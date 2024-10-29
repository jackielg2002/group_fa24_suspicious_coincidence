var jsPsychHtmlButtonResponseAdapted = (function (jspsych) {
  'use strict';

  var _package = {
    name: "@jspsych/plugin-html-button-response-adapted",
    version: "2.0.0",
    description: "jsPsych plugin for displaying a stimulus and getting a button response",
    type: "module",
    main: "dist/index.cjs",
    exports: {
      import: "./dist/index.js",
      require: "./dist/index.cjs"
    },
    typings: "dist/index.d.ts",
    unpkg: "dist/index.browser.min.js",
    files: [
      "src",
      "dist"
    ],
    source: "src/index.ts",
    scripts: {
      test: "jest",
      "test:watch": "npm test -- --watch",
      tsc: "tsc",
      build: "rollup --config",
      "build:watch": "npm run build -- --watch"
    },
    repository: {
      type: "git",
      url: "git+https://github.com/jspsych/jsPsych.git",
      directory: "packages/plugin-html-button-response"
    },
    author: "Josh de Leeuw",
    license: "MIT",
    bugs: {
      url: "https://github.com/jspsych/jsPsych/issues"
    },
    homepage: "https://www.jspsych.org/latest/plugins/html-button-response",
    peerDependencies: {
      jspsych: ">=7.1.0"
    },
    devDependencies: {
      "@jspsych/config": "^3.0.0",
      "@jspsych/test-utils": "^1.2.0"
    }
  };

  const info = {
    name: "html-button-response",
    version: _package.version,
    parameters: {
      stimulus: {
        type: jspsych.ParameterType.HTML_STRING,
        default: void 0
      },
      choices: {
        type: jspsych.ParameterType.STRING,
        default: void 0,
        array: true
      },
      button_html: {
        type: jspsych.ParameterType.FUNCTION,
        default: function (choice, choice_index) {
          return `<button class="jspsych-btn">${choice}</button>`;
        }
      },
      prompt: {
        type: jspsych.ParameterType.HTML_STRING,
        default: null
      },
      stimulus_duration: {
        type: jspsych.ParameterType.INT,
        default: null
      },
      trial_duration: {
        type: jspsych.ParameterType.INT,
        default: null
      },
      button_layout: {
        type: jspsych.ParameterType.STRING,
        default: "grid"
      },
      grid_rows: {
        type: jspsych.ParameterType.INT,
        default: 1
      },
      grid_columns: {
        type: jspsych.ParameterType.INT,
        default: null
      },
      button_label: {
        type: jspsych.ParameterType.STRING,
        default: 'SUBMIT'
      },
      response_ends_trial: {
        type: jspsych.ParameterType.BOOL,
        default: true
      },
      enable_button_after: {
        type: jspsych.ParameterType.INT,
        default: 0
      }
    },
    data: {
      rt: {
        type: jspsych.ParameterType.INT
      },
      response: {
        type: jspsych.ParameterType.INT
      },
      stimulus: {
        type: jspsych.ParameterType.HTML_STRING
      }
    }
  };
  class HtmlButtonResponsePlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }
    static info = info;
    trial(display_element, trial) {
      const stimulusElement = document.createElement("div");
      stimulusElement.id = "jspsych-html-button-response-stimulus";
      stimulusElement.innerHTML = trial.stimulus;
      display_element.appendChild(stimulusElement);
      const buttonGroupElement = document.createElement("div");
      buttonGroupElement.id = "jspsych-html-button-response-btngroup";
      if (trial.button_layout === "grid") {
        buttonGroupElement.classList.add("jspsych-btn-group-grid");
        if (trial.grid_rows === null && trial.grid_columns === null) {
          throw new Error(
            "You cannot set `grid_rows` to `null` without providing a value for `grid_columns`."
          );
        }
        const n_cols = trial.grid_columns === null ? Math.ceil(trial.choices.length / trial.grid_rows) : trial.grid_columns;
        const n_rows = trial.grid_rows === null ? Math.ceil(trial.choices.length / trial.grid_columns) : trial.grid_rows;
        buttonGroupElement.style.gridTemplateColumns = `repeat(${n_cols}, 1fr)`;
        buttonGroupElement.style.gridTemplateRows = `repeat(${n_rows}, 1fr)`;
      } else if (trial.button_layout === "flex") {
        buttonGroupElement.classList.add("jspsych-btn-group-flex");
      }
      for (const [choiceIndex, choice] of trial.choices.entries()) {
        buttonGroupElement.insertAdjacentHTML("beforeend", trial.button_html(choice, choiceIndex));
        const buttonElement = buttonGroupElement.lastChild;
        buttonElement.dataset.choice = choiceIndex.toString();
        //add button element id
        buttonElement.id = 'jspsych-html-button-response-button-' + choiceIndex.toString();
        buttonElement.addEventListener("click", () => {
          after_response(choiceIndex);
        });
      }
      display_element.appendChild(buttonGroupElement);

      //tweak: add submit button
      var submit_btn = document.createElement("button");
      submit_btn.id = "jspsych-html-button-response-submit";
      submit_btn.classList.add("jspsych-btn");
      submit_btn.innerHTML = trial.button_label;
      display_element.appendChild(submit_btn);

      //add event listener to final submission button
      display_element.querySelector('#jspsych-html-button-response-submit').addEventListener('click', function (e) {
        //require at least one image click before advancing
        if (response_counter > 0) {
          end_trial();
        } else {
          display_element.insertAdjacentHTML('beforeend', '<p style="color:red"><b>Please make at least one selection.</b></p>');
        }

      });


      if (trial.prompt !== null) {
        display_element.insertAdjacentHTML("beforeend", trial.prompt);
      }


      var start_time = performance.now();
      var response = {
        rt: null,
        selection_array: null,
        selection_index: null,
        rt_array: null,
        selection_type_array: null,
        final_choice_array:null
      };
      //temporary arrays to hold selection information
      var selections = [];
      var selection_indices = [];
      var selection_rts = [];
      var selection_types = [];
      var final_choices = [];
      // response counter
      var response_counter = 0;

      const end_trial = () => {

        var end_time = performance.now();
        var rt = Math.round(end_time - start_time);
        response.rt = rt;

        response.rt_array = selection_rts;
        response.selection_array = selections;
        response.selection_index = selection_indices;
        response.selection_type_array = selection_types;
        response.final_choice_array = final_choices;

        var trial_data = {
          selection_array: response.selection_array,
          selection_index: response.selection_index,
          rt_array: response.rt_array,
          selection_type_array: response.selection_type_array,
          final_choice_array: response.final_choice_array,
          final_rt: response.rt,
          stimulus: trial.stimulus
        };
        this.jsPsych.finishTrial(trial_data);
      };

      function toggle_response(choice) {

        //add RT
        var cur_time = performance.now();
        var cur_rt = Math.round(cur_time - start_time);
        selection_rts.push(cur_rt);

        //add selection
        var image_choice = trial.choices[choice];
        selections.push(image_choice);
        selection_indices.push(choice);

        //update response counter
        response_counter = response_counter + 1;

        console.log(selections);
        console.log(selection_indices);
        console.log(selection_rts);

        if (document.getElementById('jspsych-html-button-response-button-' + choice).style.color == "purple") {
          document.getElementById('jspsych-html-button-response-button-' + choice).style.color = "#333";
          document.getElementById('jspsych-html-button-response-button-' + choice).style.borderColor = "#ccc";
          document.getElementById('jspsych-html-button-response-button-' + choice).style.border = "1px solid transparent";
          //update data storage
          //update selection array type
          selection_types.push("unselect");
          //remove from final choice array
          var index = final_choices.indexOf(image_choice);
          if (index > -1) {
            final_choices.splice(index, 1);
          }
        } else {
          document.getElementById('jspsych-html-button-response-button-' + choice).style.color = "purple";
          document.getElementById('jspsych-html-button-response-button-' + choice).style.border = "1px solid";
          //update data storage
          //update selection array type
          selection_types.push("select");
          //add to final choice array
          final_choices.push(image_choice);
        }

        //console.log(selection_types);
        //console.log(final_choices);
      }

      function after_response(choice) {

        // var end_time = performance.now();
        // var rt = Math.round(end_time - start_time);
        // response.button = parseInt(choice);
        // response.rt = rt;

        toggle_response(choice);

        stimulusElement.classList.add("responded");
        // for (const button of buttonGroupElement.children) {
        //   button.setAttribute("disabled", "disabled");
        // }
        if (trial.response_ends_trial) {
          end_trial();
        }
      }
      if (trial.stimulus_duration !== null) {
        this.jsPsych.pluginAPI.setTimeout(() => {
          stimulusElement.style.visibility = "hidden";
        }, trial.stimulus_duration);
      }
      if (trial.enable_button_after > 0) {
        var btns = document.querySelectorAll(".jspsych-html-button-response-button button");
        for (var i = 0; i < btns.length; i++) {
          btns[i].setAttribute("disabled", "disabled");
        }
        this.jsPsych.pluginAPI.setTimeout(() => {
          var btns2 = document.querySelectorAll(".jspsych-html-button-response-button button");
          for (var i2 = 0; i2 < btns2.length; i2++) {
            btns2[i2].removeAttribute("disabled");
          }
        }, trial.enable_button_after);
      }
      if (trial.trial_duration !== null) {
        this.jsPsych.pluginAPI.setTimeout(end_trial, trial.trial_duration);
      }
    }
    simulate(trial, simulation_mode, simulation_options, load_callback) {
      if (simulation_mode == "data-only") {
        load_callback();
        this.simulate_data_only(trial, simulation_options);
      }
      if (simulation_mode == "visual") {
        this.simulate_visual(trial, simulation_options, load_callback);
      }
    }
    create_simulation_data(trial, simulation_options) {
      const default_data = {
        stimulus: trial.stimulus,
        rt: this.jsPsych.randomization.sampleExGaussian(500, 50, 1 / 150, true) + trial.enable_button_after,
        response: this.jsPsych.randomization.randomInt(0, trial.choices.length - 1)
      };
      const data = this.jsPsych.pluginAPI.mergeSimulationData(default_data, simulation_options);
      this.jsPsych.pluginAPI.ensureSimulationDataConsistency(trial, data);
      return data;
    }
    simulate_data_only(trial, simulation_options) {
      const data = this.create_simulation_data(trial, simulation_options);
      this.jsPsych.finishTrial(data);
    }
    simulate_visual(trial, simulation_options, load_callback) {
      const data = this.create_simulation_data(trial, simulation_options);
      const display_element = this.jsPsych.getDisplayElement();
      this.trial(display_element, trial);
      load_callback();
      if (data.rt !== null) {
        this.jsPsych.pluginAPI.clickTarget(
          display_element.querySelector(
            `#jspsych-html-button-response-btngroup [data-choice="${data.response}"]`
          ),
          data.rt
        );
      }
    }
  }

  return HtmlButtonResponsePlugin;

})(jsPsychModule);
