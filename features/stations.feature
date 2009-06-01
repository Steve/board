Feature: station
    In order to represent the workflow
    As a user
    I want to be able to create, update, delete and re-order station 

    Scenario: create a station
        Given I am viewing the board
        When I click on create a new station
        And I fill in the name of the station as "story queue"
        And I fill in the in-progress count as "5"
        Then a new station is created

    Scenario: re-order a station
        Given two or more stations
        When I drag station 1 to be after station 2
        Then the station 1 is now station 2
        And station 2 is now station 1

    Scenario: delete a non-empty station
        Given a station that is not empty
        When I click on delete a station
        And I select what station to move all the cards to
        And I confirm the delete
        Then the station is removed from the system

    Scenario: delete an empty station
        Given an empty station
        When I click on delete a station
        And I confirm the delete
        Then the station is removed from the system

    Scenario: rename a station
        Given a station
        When I select the station name
        And I fill in "new station name"
        Then the station is named "new station name"

    Scenario: decrease the in-progress count below the current number of cards
        Given a station
        When I fill in a number lower than the current number of cards
        Then I will see an error

    Scenario: decrease the in-progress count to greater or equal to the current number of cards
        Given a station
        When I change the max in-progress count in a number lower than the current number of cards
        Then I will see an error
