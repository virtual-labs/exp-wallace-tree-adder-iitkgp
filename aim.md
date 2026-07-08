# Objective:

## Objective of 4 bit wallace tree adder:
This is an adder with less height.

1. understanding behaviour of wallace tree adder from module designed by the student as part of the experiment an dthe working module as well
2. understanding the concept of reducing gate delay by using tree of adders instead of using cascaded full adders
3. the adder will add three 4 bit numbers

#### Examining behaviour of wallace tree adder for the module designed by the student as part of the experiment (refer to the circuit diagram)
#### Loading data in the carry lookahead adder (refer to procedure tab for further detail and experiment manual for pin numbers)
- load the three input numbers in the adder units as:
  - 1111, 0001 and 1110
#### Examining the behaviour:
- check output sum 1110
- check final output carry 1
- check intermediate carry bit and sum bit of the unit adders (refer to theory and circuit diagram)
- probing the any port can be done by verifying the color of the wire coming out of the port
- color configuration of wire for 5 valued logic supported by the simulator:
      - if value is UNKNOWN, wire color= maroon
      - if value is TRUE, wire color= blue
      - if value is FALSE, wire color= black
      - if value is HI IMPEDENCE, wire color= green
      - if value is INVALID, wire color= orange

#### Examining behaviour of given wallace tree adder for the workng module:

#### Loading data in the wallace tree adder (refer to procedure tab for further detail and experiment manual for pin numbers) as:
- load the three input numbers as:
      - A(A3 A2 A1 A0): A3=1, A2=1, A1=1, A0=1
      - B(B3 B2 B1 B0): B3=0, B2=0, B1=0, B0=1
      - C(C3 C2 C1 C0): C3=1, C2=1, C1=1, C0=0

#### Examining the behaviour:
- check output sum:
      - sum(S3 S2 S1 S0): S3=1, S2=1, S1=1, S0=0
- check output carry:
      - cout=1
#### Recommended learning activities for the experiment: 
Leaning activities are designed in two stages, a basic stage and an advanced stage. Accomplishment of each stage can be self-evaluated through the given set of quiz questions consisting of multiple type and subjective type questions. In the basic stage, it is recommended to perform the experiment firstly, on the given encapsulated working module, secondly, on the module designed by the student, having gone through the theory, objective and procuder. By performing the experiment on the working module, students can only observe the input-output behavior. Where as, performing experiments on the designed module, students can do circuit analysis, error analysis in addition with the input-output behavior. It is recommended to perform the experiments following the given guideline to check behavior and test plans along with their own circuit analysis. Then students are recommended to move on to the advanced stage. The advanced stage includes the accomplishment of the given assignments which will provide deeper understanding of the topic with innovative circuit design experience. At any time, students can mature their knowledge base by further reading the references provided for the experiment.

- color configuration of wire for 5 valued logic supported by the simulator:
      - if value is UNKNOWN, wire color= maroon
      - if value is TRUE, wire color= blue
      - if value is FALSE, wire color= black
      - if value is HI IMPEDENCE, wire color= green
      - if value is INVALID, wire color= orange

## Test Plan :
- Take three 4-bits number. Give proper inputs to check the identity, commutativity, associativity of addition operation with interchanging input values, setting zero(0) to one input.

Use Display units for checking output. Try to use minimum number of components to build. The pin configuration of the canned components are shown when mouse hovered over a component.

## Assignment Statements :

You are required to build the following Wallace tree adders

1. Adder to add seven bits
2. Adder to add three 4-bit numbers
3. Adder to add five 4-bit numbers
4. Adder to add seven 4-bit numbers