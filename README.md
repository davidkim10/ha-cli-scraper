# HA CLI Web Scraper

Node based web scraping tool built for a sales team at Home Advisor to help aggregate contractor lead data from the Washington License Board.

Data points that are collected include the following:

- Business Name
- Owner First Name
- Owner Last Name
- Phone Number
- Contractor License Effective Date
- Contractor License Expiration Date

The scraped lead data is parsed and exported into a CSV file.

## 🚀 Quick start

1.  **Project Setup**

    Clone the project and install the dependencies

    ```shell
    git clone https://github.com/davidkim10/ha-cli-scraper
    cd ha-cli-scraper
    npm install
    ```

2.  **Basic Usage**

    ```shell
    node scrape --query=plumbing --quantity=10
    ```

    | Parameters | Description                          |
    | ---------- | ------------------------------------ |
    | query      | Enter keyword or desired search term |
    | quantity   | Desired quantity of lead results     |

## 📷 Screenshots

![Screenshots](./screenshot-01.png)
