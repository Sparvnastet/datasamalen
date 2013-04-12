/**
 * Copyright 2013 Anders Sundman <anders@4zm.org>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

int step_pin      = 13;
int inhibit_pin   = 11;
int direction_pin = 12;

int button1_pin   = 3;
int button2_pin   = 2;

int sensor_pin = 10;

int direction = 1;
int sensor_val = 0;

int step_cnt = 0;
int step_min_on_time = 5;
int step_speed = 10;
int step_cnt_max = 200;

void setup()
{                
  pinMode(step_pin, OUTPUT);     
  pinMode(inhibit_pin, OUTPUT);     
  pinMode(direction_pin, OUTPUT);
  pinMode(button1_pin, INPUT);
  digitalWrite(button1_pin, HIGH);
  pinMode(button2_pin, INPUT);
  digitalWrite(button2_pin, HIGH);

  digitalWrite(inhibit_pin, HIGH);
  digitalWrite(direction_pin, direction);
  
  Serial.begin(9600);
  delay(2000);
}

void loop()
{
  prepare_step();
  step();  
}

void prepare_step()
{
  
  // Recalibrate if button 1 is pressed
  if (digitalRead(button1_pin) == LOW) {
    step_cnt = 0;
  }
  
  // Turn early if button 2 is pressed
  if (digitalRead(button2_pin) == LOW) {
    if (step_cnt > 0) {
      direction = 1;
    } else {
      direction = 0; 
    }
  }  
  

  // Reverse direction at ends
  if (step_cnt >= step_cnt_max) {
    direction = 1;   
  }
  
  if (step_cnt <= -step_cnt_max) {
    direction = 0;  
  }
  
  digitalWrite(direction_pin, direction);

  // Keep track of position
  if (direction > 0)
    --step_cnt;
  else
    ++step_cnt;

  // Send angulare info
  Serial.println(step_cnt * 100 / step_cnt_max);
}

void step() 
{
  // Create a negative flank to trigger step
  digitalWrite(step_pin, LOW);
  delay(1);
  digitalWrite(step_pin, HIGH);
  
  delay(step_speed);
}
