var tape = require("tape");
var Parser = require("./index.js");

// Constants
var
	CHARACTER_MINUS = 0x2d,
	CHARACTER_PLUS = 0x2b,
	CHARACTER_ZERO = 0x30,
	CHARACTER_POINT = 0x2e,
	CHARACTER_UPPER_E = 0x45,
	CHARACTER_LOWER_E = 0x65,
	CHARACTER_LOWER_X = 0x78
;

// Example state description
var floatStates = {
	"start": {
		acceptStates: [
			function() {
				return "float";
			}
		]
	},
	"float": {
		skipWhitespace: true,
		process: function(parser) {
			parser.setValue("");
			return true;
		},
		acceptStates: [
			function(charCode) {
				if(charCode === CHARACTER_ZERO) {
					return "number-starting-0";
				}
			},
			function(charCode) {
				if(Parser.isNonZeroDigit(charCode)) {
					return "number-integer";
				}
			},
			function(charCode, parser) {
				if(parser.skipString("zero")) {
					parser.setValue("0");
					return "end-float";
				}
			}
		],
		errorCode: "MISSING_VALUE"
	},
	"end-float": {
		skipWhitespace: true,
		process: function(parser) {
			parser.setValue(parseFloat(parser.getValue()));
			return true;
		},
		isFinal: true
	},
	"number-starting-0": {
		process: function(parser) {
			parser.skipCharacter();
			parser.setValue(parser.getValue() + "0");
			return true;
		},
		acceptStates: [
			function(charCode, parser) {
				if(charCode === CHARACTER_POINT) {
					parser.skipCharacter();
					parser.setValue(parser.getValue() + String.fromCharCode(charCode));
					return "begin-number-fraction";
				}
			},
			function(charCode, parser) {
				if(charCode === CHARACTER_LOWER_E || charCode === CHARACTER_UPPER_E) {
					parser.skipCharacter();
					parser.setValue(parser.getValue() + String.fromCharCode(charCode));
					return "begin-number-exponent";
				}
			},
			function(charCode, parser) {
				if(charCode === CHARACTER_LOWER_X) {
					parser.skipCharacter();
					parser.setValue("");
					return "hex-number";
				}
			},
			function() {
				return "end-float";
			}
		]
	},
	"hex-number": {
		acceptStates: [
			function(charCode, parser) {
				if(Parser.isHexDigit(charCode)) {
					parser.skipCharacter();
					parser.setValue(parser.getValue() + String.fromCharCode(charCode));
					return "hex-number";
				}
			},
			function() {
				return "end-hex-number";
			}
		]
	},
	"end-hex-number": {
		process: function(parser) {
			var value = parseInt(parser.getValue(), 16);
			if(value % 2 === 0) {
				parser.skipWhitespace();
				parser.setValue(value);
				return true;
			}
			return "HEX_VALUE_NOT_EVEN";
		},
		isFinal: true
	},
	"number-integer": {
		acceptStates: [
			function(charCode, parser) {
				if(Parser.isDigit(charCode)) {
					parser.skipCharacter();
					parser.setValue(parser.getValue() + String.fromCharCode(charCode));
					return "number-integer";
				}
			},
			function(charCode, parser) {
				if(charCode === CHARACTER_POINT) {
					parser.skipCharacter();
					parser.setValue(parser.getValue() + String.fromCharCode(charCode));
					return "begin-number-fraction";
				}
			},
			function(charCode, parser) {
				if(charCode === CHARACTER_LOWER_E || charCode === CHARACTER_UPPER_E) {
					parser.skipCharacter();
					parser.setValue(parser.getValue() + String.fromCharCode(charCode));
					return "begin-number-exponent";
				}
			},
			function() {
				return "end-float";
			}
		]
	},
	"begin-number-fraction": {
		acceptStates: [
			function(charCode, parser) {
				if(Parser.isDigit(charCode)) {
					parser.skipCharacter();
					parser.setValue(parser.getValue() + String.fromCharCode(charCode));
					return "number-fraction";
				}
			}
		],
		errorCode: "INVALID_NUMBER_FRACTION"
	},
	"number-fraction": {
		acceptStates: [
			function(charCode, parser) {
				if(Parser.isDigit(charCode)) {
					parser.skipCharacter();
					parser.setValue(parser.getValue() + String.fromCharCode(charCode));
					return "number-fraction";
				}
			},
			function(charCode, parser) {
				if(charCode === CHARACTER_LOWER_E || charCode === CHARACTER_UPPER_E) {
					parser.skipCharacter();
					parser.setValue(parser.getValue() + String.fromCharCode(charCode));
					return "begin-number-exponent";
				}
			},
			function() {
				return "end-float";
			}
		]
	},
	"begin-number-exponent": {
		acceptStates: [
			function(charCode, parser) {
				if(charCode === CHARACTER_MINUS) {
					parser.skipCharacter();
					parser.setValue(parser.getValue() + String.fromCharCode(charCode));
					return "begin-number-exponent-digits";
				}
			},
			function(charCode, parser) {
				if(charCode === CHARACTER_PLUS) {
					parser.skipCharacter();
					parser.setValue(parser.getValue() + String.fromCharCode(charCode));
					return "begin-number-exponent-digits";
				}
			},
			function(charCode) {
				if(Parser.isDigit(charCode)) {
					return "number-exponent-digits";
				}
			}
		],
		errorCode: "INVALID_NUMBER_EXPONENT"
	},
	"begin-number-exponent-digits": {
		acceptStates: [
			function(charCode, parser) {
				if(Parser.isDigit(charCode)) {
					parser.skipCharacter();
					parser.setValue(parser.getValue() + String.fromCharCode(charCode));
					return "number-exponent-digits";
				}
			}
		],
		errorCode: "INVALID_NUMBER_EXPONENT"
	},
	"number-exponent-digits": {
		acceptStates: [
			function(charCode, parser) {
				if(Parser.isDigit(charCode)) {
					parser.skipCharacter();
					parser.setValue(parser.getValue() + String.fromCharCode(charCode));
					return "number-exponent-digits";
				}
			},
			function() {
				return "end-float";
			}
		]
	}
};

// Convenience method
function parseNextFloatValue(string, from) {
	return (new Parser(floatStates)).parse(string, from);
}

tape("parse floats", function(test) {
	test.deepEqual((new Parser(floatStates)).parse(), { value: undefined, index: 0, errorCode: "MISSING_VALUE" }, "Fail parse <>");
	test.deepEqual(parseNextFloatValue(""), { value: undefined, index: 0, errorCode: "MISSING_VALUE" }, "Fail parse <>");
	test.deepEqual(parseNextFloatValue("   "), { value: undefined, index: 3, errorCode: "MISSING_VALUE" }, "Fail parse <   >");
	test.deepEqual(parseNextFloatValue("   123   "), { value: 123, index: 9 }, "Parse <   123   >");
	test.deepEqual(parseNextFloatValue("   123.456   "), { value: 123.456, index: 13 }, "Parse <   123.456   >");
	test.deepEqual(parseNextFloatValue("   123.456e2   "), { value: 12345.6, index: 15 }, "Parse <   123.456e2   >");
	test.deepEqual(parseNextFloatValue("   zero   "), { value: 0, index: 10 }, "Parse <   zero   >");
	test.deepEqual(parseNextFloatValue("   0x16   "), { value: 22, index: 10 }, "Parse <   0x16   >");
	test.deepEqual(parseNextFloatValue("   0x16g   "), { value: 22, index: 7 }, "Parse <   0x16g   >");
	test.deepEqual(parseNextFloatValue("   0x17   "), { value: undefined, index: 7, errorCode: "HEX_VALUE_NOT_EVEN" }, "Parse <   0x17   >");
	test.end();
});
