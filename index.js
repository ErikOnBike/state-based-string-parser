module.exports = (function() {

	// Constants
	var
		CHARACTER_SPACE = 0x20,
		CHARACTER_TAB = 0x09,
		CHARACTER_CARRIAGE_RETURN = 0x0d,
		CHARACTER_LINE_FEED = 0x0a,
		CHARACTER_ZERO = 0x30,
		CHARACTER_ONE = 0x31,
		CHARACTER_NINE = 0x39,
		CHARACTER_UPPER_A = 0x41,
		CHARACTER_UPPER_F = 0x46,
		CHARACTER_LOWER_A = 0x61,
		CHARACTER_LOWER_F = 0x66
	;

	// Parser class
	function Parser(states) {

		// Set instance variables
		this.input = {		// String input (incl. position and length)
			string: "",
			index: 0,
			length: 0
		};
		this.states = states;	// All possible states
		this.valueStack = [];	// Assuming nested constructions are possible
	}

	// Class methods (convenience)
	Parser.isDigit = function(charCode) {
		return charCode >= CHARACTER_ZERO && charCode <= CHARACTER_NINE;
	};
	Parser.isNonZeroDigit = function(charCode) {
		return charCode >= CHARACTER_ONE && charCode <= CHARACTER_NINE;
	};
	Parser.isHexDigit = function(charCode) {
		return Parser.isDigit(charCode) ||
			(charCode >= CHARACTER_LOWER_A && charCode <= CHARACTER_LOWER_F) ||
			(charCode >= CHARACTER_UPPER_A && charCode <= CHARACTER_UPPER_F)
		;
	};
	Parser.isWhitespace = function(charCode) {
		return	charCode === CHARACTER_SPACE ||
			charCode === CHARACTER_LINE_FEED ||
			charCode === CHARACTER_CARRIAGE_RETURN ||
			charCode === CHARACTER_TAB
		;
	};

	// Instance methods (input handling)
	Parser.prototype.getCharCode = function() {
		var input = this.input;
		return input.string.charCodeAt(input.index);
	};
	Parser.prototype.skipCharacter = function() {
		this.input.index++;
	};
	Parser.prototype.skipString = function(string) {
		var length = string.length;
		var input = this.input;
		if(input.string.slice(input.index, input.index + length) === string) {
			input.index += length;
			return true;
		}
		return false;
	};
	Parser.prototype.skipWhitespace = function() {
		var input = this.input;
		while(input.index < input.length && Parser.isWhitespace(this.getCharCode())) {
			input.index++;
		}
	};

	// Instance methods (getting/setting current value)
	Parser.prototype.getValue = function() {
		var valueStack = this.valueStack;
		return valueStack[valueStack.length - 1];
	};
	Parser.prototype.setValue = function(value) {
		var valueStack = this.valueStack;
		valueStack[valueStack.length - 1] = value;
	};

	// Instance methods (parsing)
	Parser.prototype.parse = function(string, from) {

		// Update input (if present)
		if(arguments.length > 0) {
			this.input.string = string;
			this.input.from = from || 0;
			this.input.length = string.length;
		}

		// Start with start state and 'empty' value
		var state = this.states["start"];
		this.valueStack.push(undefined);	// Add value (still undefined)

		// Iterate until a final state is reached
		while(!state.isFinal) {

			// Find first acceptable next state
			var nextStateName = null;
			var charCode = this.getCharCode(); 
			state.acceptStates.some(function(acceptState) {
				nextStateName = acceptState(charCode, this);
				return !!nextStateName;
			}, this);

			// If found, go to next state and perform state processing
			if(nextStateName) {
				state = this.states[nextStateName];
				if(state.skipWhitespace) {
					this.skipWhitespace();
				}
				if(state.process) {
					var result = state.process(this);
					if(result !== true) {
						return { value: undefined, index: this.input.index, errorCode: result };
					}
				}
			} else {
				return { value: undefined, index: this.input.index, errorCode: state.errorCode };
			}
		}

		// Answer current value as result
		var value = this.valueStack.pop();
		return { value: value, index: this.input.index };
	};

	return Parser;
})();
