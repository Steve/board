Feature: cards
    In order to represent the work in progress
    As a user
    I want to be able to create, read, update and delete cards

    Scenario: create a new "thing in progress"
        Given I am viewing the board
        When I drag a card off of the stack of empty cards
        And I drop it into a column
        Then a new card is created named "new card"

    Scenario: delete card
        Given I see an existing card
        When I click on "delete" for that card
        And confirm the delete
        Then the card is deleted from the board

    Scenario: move card to an empty slot
        Given a column with an empty slot
        When I drag a card into a column
        Then the card is placed into an empty slot

    Scenario: move card to full column
        Given a column with no empty slots
        When I drag a card into a column
        Then the card reverts to where it was dragged from
