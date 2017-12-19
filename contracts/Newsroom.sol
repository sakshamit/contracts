pragma solidity 0.4.18;
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


contract Newsroom is Ownable {
  event ArticleProposed(address indexed author, uint indexed id);
  event ArticleApproved(uint id);
  event ArticleDenied(uint id);

  uint private latestId;
  mapping(uint => Article) private articles;
  mapping(uint => bool) private waiting;
  mapping(uint => bool) private approved;

  function author(uint articleId) public view returns (address) {
    return articles[articleId].author;
  }

  function uri(uint articleId) public view returns (string) {
    return articles[articleId].uri;
  }

  function timestamp(uint articleId) public view returns (uint) {
    return articles[articleId].timestamp;
  }

  function isProposed(uint articleId) public view returns (bool) {
    return waiting[articleId];
  }

  function isApproved(uint articleId) public view returns (bool) {
    return approved[articleId];
  }

  function proposeArticle(string articleUri) public returns (uint) {
    require(bytes(articleUri).length > 0);

    uint id = latestId;
    latestId++;

    articles[id] = Article(
      articleUri,
      msg.sender,
      now
    );
    waiting[id] = true;
    ArticleProposed(msg.sender, id);
    return id;
  }

  function approveArticle(uint id) public onlyOwner {
    require(waiting[id] == true);
    require(articles[id].author != 0x0);
    delete waiting[id];
    approved[id] = true;
    ArticleApproved(id);
  }

  function denyArticle(uint id) public onlyOwner {
    require(waiting[id] == true);
    delete waiting[id];
    delete articles[id];
    ArticleDenied(id);
  }

  struct Article {
    string uri;
    address author;
    uint timestamp;
  }
}