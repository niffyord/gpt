import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { useSelector } from "react-redux";
import "../assets/nftstaking.css";
import Boss2 from "../assets/img/Boss2.png";
import eth from "../assets/img/eth.png";
import { Button, Card, Spinner } from "react-bootstrap";
import cloudBunnyContract from "../artifacts/CloudBunny.sol/CloudBunny.json";
import nftStakingVaultContract from "../artifacts/NFTStakingVaults.sol/NFTStakingVaults.json";
import {
  cloudBunnyContractAddress,
  nftStakingVaultsContractAddress,
  networkDeployedTo,
} from "../utils/contracts-config";
import networksMap from "../utils/networksMap.json";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import AlertModal from "../components/AlertModal";
import Tilt from "react-parallax-tilt";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCube,
  faCubes,
  faPercent,
  faCheckSquare,
  faDoorOpen,
  faArrowDown,
  faCoins,
  faInfoCircle,
  faSpinner,
  faArrowUp,
  faCheck,
  faStar,
  faGem,
  faFire,
  faCrown,
} from "@fortawesome/free-solid-svg-icons";
import { faEthereum } from "@fortawesome/free-brands-svg-icons";
import { Link } from "react-router-dom";

function NFTStakingPage() {
  const data = useSelector((state) => state.blockchain.value);
  const [nftStakingContract, setNftStakingContract] = useState(null);
  const [stakedNFTsEth, setStakedNFTsEth] = useState([]);
  const [stakedNFTsShdw, setStakedNFTsShdw] = useState([]);
  const [ethVaultRewards, setEthVaultRewards] = useState([]);
  const [shdwVaultRewards, setShdwVaultRewards] = useState([]);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [ethVaultData, setEthVaultData] = useState({});
  const [shdwVaultData, setShdwVaultData] = useState({});
  const [stakedNFTsEthVault, setStakedNFTsEthVault] = useState(0);
  const [stakedNFTsShdwVault, setStakedNFTsShdwVault] = useState(0);
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const [isLoadingBtn, setIsLoadingBtn] = useState(false);

  const [userBunnies, setUserBunnies] = useState([]);

  useEffect(() => {
    const initializeContractAndFetchNFTs = async () => {
      if (data.network === networksMap[networkDeployedTo]) {
        const provider = new ethers.providers.Web3Provider(
          window.ethereum,
          "any"
        );
        const nftStaking = new ethers.Contract(
          nftStakingVaultsContractAddress,
          nftStakingVaultContract.abi,
          provider.getSigner()
        );
        setNftStakingContract(nftStaking);

        const fetchVaultData = async (
          vaultFunc,
          setStakedNFTs,
          setVaultData
        ) => {
          const vaultData = await nftStaking[vaultFunc]();
          const stakedNFTs = await nftStaking.getStakedNFTsInVault(
            vaultData.vaultType
          );
          setStakedNFTs(stakedNFTs.toString());
          setVaultData({
            vaultType: vaultData.vaultType.toString(),
            rewardRate: ethers.utils.formatEther(vaultData.rewardRate),
            maxStakableNFTs: vaultData.maxStakableNFTs.toString(),
            maxNFTsPerVault: vaultData.maxNFTsPerVault.toString(),
          });
        };

        // Fetch ETH Vault data
        await fetchVaultData(
          "ethVault",
          setStakedNFTsEthVault,
          setEthVaultData
        );

        // Fetch SHDW Vault data
        await fetchVaultData(
          "shdwVault",
          setStakedNFTsShdwVault,
          setShdwVaultData
        );

        // Move fetchStakedNFTs call here and pass nftStaking as parameter
        await fetchStakedNFTs(nftStaking);
        getInfo();
      }
    };

    // Start the interval
    const intervalId = setInterval(initializeContractAndFetchNFTs, 60000);

    // Call the function once immediately
    initializeContractAndFetchNFTs();

    // Return a cleanup function to be run on component unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [data, data.account]);

  useEffect(() => {
    const fetchRewards = async () => {
      if (data.network === networksMap[networkDeployedTo]) {
        const ethVaultRewardsPromises = stakedNFTsEth.map((nft) =>
          getEthVaultRewards(nft.id)
        );
        const shdwVaultRewardsPromises = stakedNFTsShdw.map((nft) =>
          getShdwVaultRewards(nft.id)
        );

        const ethVaultRewards = await Promise.all(ethVaultRewardsPromises);
        const shdwVaultRewards = await Promise.all(shdwVaultRewardsPromises);

        setEthVaultRewards(ethVaultRewards);
        setShdwVaultRewards(shdwVaultRewards);
      }
    };

    fetchRewards();
    const intervalId = setInterval(fetchRewards, 16000); // Fetch rewards every 60 seconds

    return () => clearInterval(intervalId); // Clear interval when component unmounts
  }, [data, data.account, stakedNFTsEth, stakedNFTsShdw]);

  const fetchStakedNFTs = async (nftStaking) => {
    try {
      const stakedEth = await nftStaking.getStakedTokensInEthVault(
        data.account
      );
      const stakedShdw = await nftStaking.getStakedTokensInShdwVault(
        data.account
      );

      const provider = new ethers.providers.Web3Provider(
        window.ethereum,
        "any"
      );
      const bunny_contract = new ethers.Contract(
        cloudBunnyContractAddress,
        cloudBunnyContract.abi,
        provider
      );

      const fetchMetadata = async (tokenId) => {
        const metadata = await axios.get(
          (
            await bunny_contract.tokenURI(tokenId)
          ).replace("ipfs://", "https://ipfs.io/ipfs/")
        );

        const attributes = metadata.data.attributes;
        let traitCount = 0;

        for (let attribute of attributes) {
          if (attribute.trait_type === "Trait Count") {
            traitCount = attribute.value;
            break;
          }
        }

        let rarityCategory = "";
        if (traitCount <= 2) {
          rarityCategory = "Common";
        } else if (traitCount <= 4) {
          rarityCategory = "Uncommon";
        } else if (traitCount <= 6) {
          rarityCategory = "Rare";
        } else {
          rarityCategory = "Ultra Rare";
        }

        return {
          id: tokenId.toString(),
          uri: metadata.data.image.replace("ipfs://", "https://ipfs.io/ipfs/"),
          rarityCategory,
        };
      };

      const stakedNFTsEthWithMetadata = await Promise.all(
        stakedEth.map(fetchMetadata)
      );
      const stakedNFTsShdwWithMetadata = await Promise.all(
        stakedShdw.map(fetchMetadata)
      );

      setStakedNFTsEth(stakedNFTsEthWithMetadata);
      setStakedNFTsShdw(stakedNFTsShdwWithMetadata);
    } catch (err) {
      console.error("Failed to fetch staked NFTs:", err);
    }
  };

  const getInfo = async () => {
    if (data.network === networksMap[networkDeployedTo]) {
      const provider = new ethers.providers.Web3Provider(
        window.ethereum,
        "any"
      );
      const bunny_contract = new ethers.Contract(
        cloudBunnyContractAddress,
        cloudBunnyContract.abi,
        provider
      );

      const userBunniesIds = await bunny_contract.walletOfOwner(data.account);

      const _userBunnies = await Promise.all(
        userBunniesIds.map(async (bunnyId) => {
          const metadata = await axios.get(
            (
              await bunny_contract.tokenURI(bunnyId)
            ).replace("ipfs://", "https://cloudflare-ipfs.com/ipfs/")
          );

          const attributes = metadata.data.attributes;

          let traitCount = 0;

          // Get trait count from attributes
          for (let attribute of attributes) {
            if (attribute.trait_type === "Trait Count") {
              traitCount = attribute.value;
              break;
            }
          }

          // Determine rarity based on trait count
          let rarityCategory = "";
          if (traitCount <= 2) {
            rarityCategory = "Common";
          } else if (traitCount <= 4) {
            rarityCategory = "Uncommon";
          } else if (traitCount <= 6) {
            rarityCategory = "Rare";
          } else {
            rarityCategory = "Ultra Rare";
          }

          return {
            id: bunnyId.toString(),
            uri: metadata.data.image.replace(
              "ipfs://",
              "https://cloudflare-ipfs.com/ipfs/"
            ),
            rarityCategory,
          };
        })
      );

      setUserBunnies(_userBunnies);
    }
  };

  const checkIfApproved = async (tokenId, bunny) => {
    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    const signer = provider.getSigner();
    const bunnyContract = new ethers.Contract(
      cloudBunnyContractAddress,
      cloudBunnyContract.abi,
      signer
    );

    const approvedAddress = await bunnyContract.getApproved(tokenId);

    if (
      approvedAddress.toLowerCase() ===
      nftStakingVaultsContractAddress.toLowerCase()
    ) {
      bunny.isApproved = true;
    }
  };

  const approveNFT = async (tokenId, bunny) => {
    try {
      const provider = new ethers.providers.Web3Provider(
        window.ethereum,
        "any"
      );
      const signer = provider.getSigner();
      const bunnyContract = new ethers.Contract(
        cloudBunnyContractAddress,
        cloudBunnyContract.abi,
        signer
      );

      const tx = await bunnyContract.approve(
        nftStakingVaultsContractAddress,
        tokenId
      );

      await tx.wait();

      checkIfApproved(tokenId, bunny);
      showAlertMessage(`Successfully approved BOSS NFT #${tokenId}.`); // Successful Approval Message
    } catch (error) {
      console.error("Failed to approve Boss NFT:", error);
      showAlertMessage(
        `Failed to approve Boss NFT #${tokenId}: ${error.message}`
      ); // Failure Message
    }
  };

  const showAlertMessage = (message) => {
    setAlertMessage(message);
    setIsAlertOpen(true);
  };

  useEffect(() => {
    setIsLoading(true);
    // Wrap the checks inside Promise.all
    Promise.all(
      userBunnies.map((bunny) => checkIfApproved(bunny.id, bunny))
    ).then(() => setIsLoading(false)); // Once all checks are complete, set isLoading to false
  }, [userBunnies]);

  const claimEthVaultRewards = async (tokenId) => {
    try {
      await nftStakingContract.claimEthVaultRewards([tokenId]);
      showAlertMessage(
        `Successfully claimed ETH rewards for BOSS NFT #${tokenId}.`
      );
    } catch (error) {
      console.error("Failed to claim ETH vault rewards:", error);
      showAlertMessage(
        `Failed to claim ETH vault rewards for NFT ${tokenId}: ${error.message}`
      );
    }
  };

  const claimShdwVaultRewards = async (tokenId) => {
    try {
      await nftStakingContract.claimShdwVaultRewards([tokenId]);
      showAlertMessage(
        `Successfully claimed $BOSS token rewards for BOSS NFT #${tokenId}.`
      );
    } catch (error) {
      console.error("Failed to claim BOSS vault rewards:", error);
      showAlertMessage(
        `Failed to claim BOSS vault rewards for NFT ${tokenId}: ${error.message}`
      );
    }
  };

  const getEthVaultRewards = async (tokenId) => {
    try {
      const rewards = await nftStakingContract.getEthVaultRewards([tokenId]);
      return rewards[0];
    } catch (error) {
      console.error("Failed to get ETH vault rewards:", error);
      return ethers.BigNumber.from(0);
    }
  };

  const getShdwVaultRewards = async (tokenId) => {
    try {
      const rewards = await nftStakingContract.getShdwVaultRewards([tokenId]);
      return rewards[0];
    } catch (error) {
      console.error("Failed to get BOSS vault rewards:", error);
      return ethers.BigNumber.from(0);
    }
  };

  const stakeToEthVault = async (tokenId) => {
    try {
      await nftStakingContract.stakeToEthVault([tokenId]);
      showAlertMessage(`Successfully staked BOSS #${tokenId} to ETH vault.`);
    } catch (error) {
      console.error("Failed to stake to ETH vault:", error);
      showAlertMessage(
        `Failed to stake BOSS #${tokenId} to ETH vault: Staking these NFT will exceed the maximum stakable NFTs limit or Max NFTs per Vault limit, Unstake some NFTs or Move to BOSS Vault",`
      );
    }
  };

  const stakeToShdwVault = async (tokenId) => {
    try {
      await nftStakingContract.stakeToShdwVault([tokenId]);
      showAlertMessage(
        `Successfully staked BOSS NFT #${tokenId} to BOSS vault.`
      );
    } catch (error) {
      console.error("Failed to stake to BOSS vault:", error);
      showAlertMessage(
        `Failed to stake BOSS #${tokenId} to BOSS vault: Staking these NFT will exceed the maximum stakable NFTs limit Max NFTs per Vault limit, Unstake some NFTs or Move to ETH Vault",`
      );
    }
  };

  const unstakeFromEthVault = async (tokenId) => {
    try {
      await nftStakingContract.unstakeFromEthVault([tokenId]);
      showAlertMessage(
        `Successfully unstaked BOSS NFT #${tokenId} from ETH vault.`
      );
    } catch (error) {
      console.error("Failed to unstake from ETH vault:", error);
      showAlertMessage(
        `Failed to unstake NFT ${tokenId} from ETH vault: ${error.message}`
      );
    }
  };

  const unstakeFromShdwVault = async (tokenId) => {
    try {
      await nftStakingContract.unstakeFromShdwVault([tokenId]);
      showAlertMessage(
        `Successfully unstaked BOSS NFT #${tokenId} from BOSS vault.`
      );
    } catch (error) {
      console.error("Failed to unstake from BOSS vault:", error);
      showAlertMessage(
        `Failed to unstake NFT ${tokenId} from BOSS vault: ${error.message}`
      );
    }
  };

  const emergencyWithdrawFromEthVault = async (tokenId) => {
    try {
      await nftStakingContract.emergencyWithdrawFromEthVault(tokenId);
      showAlertMessage(
        `Successfully performed emergency withdrawal of BOSS NFT #${tokenId} from ETH vault.`
      );
    } catch (error) {
      console.error(
        "Failed to perform emergency withdrawal from ETH vault:",
        error
      );
      showAlertMessage(
        `Failed to perform emergency withdrawal of NFT ${tokenId} from ETH vault: ${error.message}`
      );
    }
  };

  const emergencyWithdrawFromShdwVault = async (tokenId) => {
    try {
      await nftStakingContract.emergencyWithdrawFromShdwVault(tokenId);
      showAlertMessage(
        `Successfully performed emergency withdrawal of BOSS NFT #${tokenId} from BOSS vault.`
      );
    } catch (error) {
      console.error(
        "Failed to perform emergency withdrawal from BOSS vault:",
        error
      );
      showAlertMessage(
        `Failed to perform emergency withdrawal of NFT ${tokenId} from BOSS vault: ${error.message}`
      );
    }
  };

  const approveNFTHandler = async (id, nft) => {
    setIsLoadingBtn((prevState) => ({ ...prevState, [id]: { approve: true } }));
    try {
      await approveNFT(id, nft);
    } catch (error) {
      console.error(error);
    }
    setIsLoadingBtn((prevState) => ({
      ...prevState,
      [id]: { approve: false },
    }));
  };

  const stakeToEthVaultHandler = async (id) => {
    setIsLoadingBtn((prevState) => ({
      ...prevState,
      [id]: { ethStake: true },
    }));
    try {
      await stakeToEthVault(id);
    } catch (error) {
      console.error(error);
    }
    setIsLoadingBtn((prevState) => ({
      ...prevState,
      [id]: { ethStake: false },
    }));
  };

  const stakeToShdwVaultHandler = async (id) => {
    setIsLoadingBtn((prevState) => ({
      ...prevState,
      [id]: { bossStake: true },
    }));
    try {
      await stakeToShdwVault(id);
    } catch (error) {
      console.error(error);
    }
    setIsLoadingBtn((prevState) => ({
      ...prevState,
      [id]: { bossStake: false },
    }));
  };

  const unstakeFromEthVaultHandler = async (id) => {
    setIsLoadingBtn((prevState) => ({
      ...prevState,
      [id]: { ...prevState[id], unstake: true },
    }));
    try {
      await unstakeFromEthVault(id);
    } catch (error) {
      console.error(error);
    }
    setIsLoadingBtn((prevState) => ({
      ...prevState,
      [id]: { ...prevState[id], unstake: false },
    }));
  };

  const claimEthVaultRewardsHandler = async (id) => {
    setIsLoadingBtn((prevState) => ({
      ...prevState,
      [id]: { ...prevState[id], claim: true },
    }));
    try {
      await claimEthVaultRewards(id);
    } catch (error) {
      console.error(error);
    }
    setIsLoadingBtn((prevState) => ({
      ...prevState,
      [id]: { ...prevState[id], claim: false },
    }));
  };

  const emergencyWithdrawFromEthVaultHandler = async (id) => {
    setIsLoadingBtn((prevState) => ({
      ...prevState,
      [id]: { ...prevState[id], exit: true },
    }));
    try {
      await emergencyWithdrawFromEthVault(id);
    } catch (error) {
      console.error(error);
    }
    setIsLoadingBtn((prevState) => ({
      ...prevState,
      [id]: { ...prevState[id], exit: false },
    }));
  };

  const unstakeFromShdwVaultHandler = async (id) => {
    setIsLoadingBtn((prevState) => ({
      ...prevState,
      [id]: { ...prevState[id], shdwUnstake: true },
    }));
    try {
      await unstakeFromShdwVault(id);
    } catch (error) {
      console.error(error);
    }
    setIsLoadingBtn((prevState) => ({
      ...prevState,
      [id]: { ...prevState[id], shdwUnstake: false },
    }));
  };

  const claimShdwVaultRewardsHandler = async (id) => {
    setIsLoadingBtn((prevState) => ({
      ...prevState,
      [id]: { ...prevState[id], shdwClaim: true },
    }));
    try {
      await claimShdwVaultRewards(id);
    } catch (error) {
      console.error(error);
    }
    setIsLoadingBtn((prevState) => ({
      ...prevState,
      [id]: { ...prevState[id], shdwClaim: false },
    }));
  };

  const emergencyWithdrawFromShdwVaultHandler = async (id) => {
    setIsLoadingBtn((prevState) => ({
      ...prevState,
      [id]: { ...prevState[id], shdwExit: true },
    }));
    try {
      await emergencyWithdrawFromShdwVault(id);
    } catch (error) {
      console.error(error);
    }
    setIsLoadingBtn((prevState) => ({
      ...prevState,
      [id]: { ...prevState[id], shdwExit: false },
    }));
  };

  return (
    <div className="SApp">
      <NavBar />
      <AlertModal
        isOpen={isAlertOpen}
        message={alertMessage}
        onClose={() => setIsAlertOpen(false)}
      />

      <h1 className="bosses-vaults-header">The Bosses Vaults</h1>

      <section>
        <h2 className="owned-nfts-header">Your Owned NFTs</h2>

        <div className="ownedNFTsContainer d-flex flex-wrap justify-content-center">
          {userBunnies.length > 0 ? (
            userBunnies.map((nft, index) => (
              <Card
                key={index}
                className="ownedNFTCard m-2"
                style={{ width: "18rem" }}
              >
                <div className="imageContainer">
                  <Tilt options={{ max: 25 }}>
                    <Card.Img
                      variant="top"
                      src={nft.uri}
                      alt={`NFT ${nft.id}`}
                    />
                 
                  <div className="rarityBadge">
                    {nft.rarityCategory === "Common" && (
                      <>
                        <FontAwesomeIcon icon={faStar} /> Common
                      </>
                    )}
                    {nft.rarityCategory === "Uncommon" && (
                      <>
                        <FontAwesomeIcon icon={faGem} /> Uncommon
                      </>
                    )}
                    {nft.rarityCategory === "Rare" && (
                      <>
                        <FontAwesomeIcon icon={faFire} /> Rare
                      </>
                    )}
                    {nft.rarityCategory === "Ultra Rare" && (
                      <>
                        <FontAwesomeIcon icon={faCrown} /> Ultra Rare
                      </>
                    )}
                  </div>
                  </Tilt>
                </div>

                <Card.Body>
                  <Card.Title>BOSS #{nft.id}</Card.Title>
                  {nft.isApproved ? (
                    <>
                      <Button
                        variant="primary"
                        className="mr-2"
                        disabled={isLoadingBtn[nft.id]?.ethStake}
                        onClick={() => stakeToEthVaultHandler(nft.id)}
                      >
                        {isLoadingBtn[nft.id]?.ethStake ? (
                          <>
                            Staking... <FontAwesomeIcon icon={faSpinner} spin />
                          </>
                        ) : (
                          <>
                            Stake to ETH Vault{" "}
                            <FontAwesomeIcon icon={faArrowUp} />
                          </>
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={isLoadingBtn[nft.id]?.bossStake}
                        onClick={() => stakeToShdwVaultHandler(nft.id)}
                      >
                        {isLoadingBtn[nft.id]?.bossStake ? (
                          <>
                            Staking... <FontAwesomeIcon icon={faSpinner} spin />
                          </>
                        ) : (
                          <>
                            Stake to BOSS Vault{" "}
                            <FontAwesomeIcon icon={faArrowUp} />
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Card.Text>
                        Click the button below to approve this NFT for staking.
                      </Card.Text>
                      <Button
                        variant="warning"
                        disabled={isLoadingBtn[nft.id]?.approve}
                        onClick={() => approveNFTHandler(nft.id, nft)}
                      >
                        {isLoadingBtn[nft.id]?.approve ? (
                          <>
                            Approving...{" "}
                            <FontAwesomeIcon icon={faSpinner} spin />
                          </>
                        ) : (
                          <>
                            Approve NFT <FontAwesomeIcon icon={faCheck} />
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </Card.Body>
              </Card>
            ))
          ) : (
            <div className="empty-state">
              <h3>You have no NFTs in your collection.</h3>
              <p>Mint Some NFTs or Buy Some NFTs!</p>
              <div className="btn-container">
                <a
                  href="https://www.externalsite.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button className="empty-btn">Buy NFT</button>
                </a>
                <Link to="/mint-page">
                  <button className="empty-btn">Mint NFT</button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="owned-nfts-header">Staked BOSSES in ETH Vault</h2>
        <div className="vault-info-container grid-container">
          <div className="vault-item">
            <FontAwesomeIcon icon={faPercent} className="vault-icon" />
            <h3>Reward Rate:</h3>
            <p>
              {ethVaultData.rewardRate}{" "}
              <FontAwesomeIcon icon={faEthereum} className="ethicon" />{" "}
              <span className="currency">ETH</span>
            </p>
          </div>
          <div className="vault-item">
            <FontAwesomeIcon icon={faCube} className="vault-icon" />
            <h3>Max Stakable NFTs:</h3>
            <p>{ethVaultData.maxStakableNFTs}</p>
          </div>
          <div className="vault-item">
            <FontAwesomeIcon icon={faCubes} className="vault-icon" />
            <h3>Max NFTs per Vault:</h3>
            <p>{ethVaultData.maxNFTsPerVault}</p>
          </div>
          <div className="vault-item">
            <FontAwesomeIcon icon={faCheckSquare} className="vault-icon" />
            <h3>Staked NFTs:</h3>
            <p>{stakedNFTsEthVault}</p>
          </div>
        </div>

        <div className="stakedNFTsContainer d-flex flex-wrap justify-content-center position-relative">
          <a
            href="https://bossess-organization.gitbook.io/crypto-bosses/boss-guides/how-to-stake-boss-nft"
            target="_blank"
            rel="noopener noreferrer"
            className="sophisticated-btn"
          >
            <FontAwesomeIcon icon={faInfoCircle} />
            How to stake
          </a>
          {stakedNFTsEth.length > 0 ? (
            stakedNFTsEth.map((nft, index) => (
              <Card
                key={index}
                className="stakedNFTCard m-2"
                style={{ width: "18rem" }}
              >
                <Tilt options={{ max: 25 }}>
                  <div className="imageContainer">
                    <Card.Img
                      variant="top"
                      src={nft.uri}
                      alt={`NFT ${nft.id}`}
                    />
                    <div className="rarityBadge">
                      {nft.rarityCategory === "Common" && (
                        <>
                          <FontAwesomeIcon icon={faStar} /> Common
                        </>
                      )}
                      {nft.rarityCategory === "Uncommon" && (
                        <>
                          <FontAwesomeIcon icon={faGem} /> Uncommon
                        </>
                      )}
                      {nft.rarityCategory === "Rare" && (
                        <>
                          <FontAwesomeIcon icon={faFire} /> Rare
                        </>
                      )}
                      {nft.rarityCategory === "Ultra Rare" && (
                        <>
                          <FontAwesomeIcon icon={faCrown} /> Ultra Rare
                        </>
                      )}
                    </div>
                    <div
                      className="Rcontainer"
                      style={{
                        position: "absolute",
                        top: "10px",
                        left: "10px",
                      }}
                    >
                      <p className="Rtext">BOSS #{nft.id}</p>
                    </div>
                    <div
                      className="eth-image"
                      style={{
                        position: "absolute",
                        bottom: "5px",
                        left: "5px",
                      }}
                    >
                      <img
                        src={eth}
                        alt="eth"
                        style={{ width: "30px", height: "30px" }}
                      />
                    </div>
                    <div
                      className="Rtext-value"
                      style={{
                        position: "absolute",
                        bottom: "10px",
                        right: "10px",
                      }}
                    >
                      {ethVaultRewards[index] ? (
                        ethers.utils.formatEther(ethVaultRewards[index])
                      ) : (
                        <Spinner
                          animation="border"
                          className="Spinner"
                          variant="info"
                        />
                      )}
                    </div>
                  </div>
                </Tilt>

                <Card.Body>
                  <Button
                    variant="danger"
                    className="mr-2"
                    disabled={isLoadingBtn[nft.id]?.unstake}
                    onClick={() => unstakeFromEthVaultHandler(nft.id)}
                  >
                    {isLoadingBtn[nft.id]?.unstake ? (
                      <>
                        Unstaking... <FontAwesomeIcon icon={faSpinner} spin />
                      </>
                    ) : (
                      <>
                        Unstake <FontAwesomeIcon icon={faArrowDown} />
                      </>
                    )}
                  </Button>
                  <Button
                    variant="success"
                    disabled={isLoadingBtn[nft.id]?.claim}
                    onClick={() => claimEthVaultRewardsHandler(nft.id)}
                  >
                    {isLoadingBtn[nft.id]?.claim ? (
                      <>
                        Claiming... <FontAwesomeIcon icon={faSpinner} spin />
                      </>
                    ) : (
                      <>
                        Claim Rewards <FontAwesomeIcon icon={faCoins} />
                      </>
                    )}
                  </Button>
                  <Button
                    variant="danger"
                    className="exit-button mt-2"
                    disabled={isLoadingBtn[nft.id]?.exit}
                    onClick={() => emergencyWithdrawFromEthVaultHandler(nft.id)}
                  >
                    {isLoadingBtn[nft.id]?.exit ? (
                      <>
                        Exiting... <FontAwesomeIcon icon={faSpinner} spin />
                      </>
                    ) : (
                      <>
                        Exit <FontAwesomeIcon icon={faDoorOpen} />
                      </>
                    )}
                  </Button>
                </Card.Body>
              </Card>
            ))
          ) : (
            <div className="empty-state">
              <h3>You have no NFTs staked in the BOSS vault.</h3>
              <p>Stake your NFTs to earn Boss Token rewards!</p>
              <div className="btn-container">
                <a
                  href="https://www.externalsite.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button className="empty-btn">Buy NFT</button>
                </a>
                <Link to="/mint-page">
                  <button className="empty-btn">Mint NFT</button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="owned-nfts-header">Staked BOSSES in BOSS Vault</h2>
        <div className="vault-info-container grid-container">
          <div className="vault-item">
            <FontAwesomeIcon icon={faPercent} className="vault-icon" />
            <h3>Reward Rate:</h3>
            <p>
              {shdwVaultData.rewardRate}{" "}
              <FontAwesomeIcon icon={faCoins} className="ethicon" />{" "}
              <span className="currency">BOSS</span>
            </p>
          </div>
          <div className="vault-item">
            <FontAwesomeIcon icon={faCube} className="vault-icon" />
            <h3>Max Stakable NFTs:</h3>
            <p>{shdwVaultData.maxStakableNFTs}</p>
          </div>
          <div className="vault-item">
            <FontAwesomeIcon icon={faCubes} className="vault-icon" />
            <h3>Max NFTs per Vault:</h3>
            <p>{shdwVaultData.maxNFTsPerVault}</p>
          </div>
          <div className="vault-item">
            <FontAwesomeIcon icon={faCheckSquare} className="vault-icon" />
            <h3>Staked NFTs:</h3>
            <p>{stakedNFTsShdwVault}</p>
          </div>
        </div>

        <div className="stakedNFTsContainer d-flex flex-wrap justify-content-center position-relative">
          <a
            href="https://bossess-organization.gitbook.io/crypto-bosses/boss-guides/how-to-stake-boss-nft"
            target="_blank"
            rel="noopener noreferrer"
            className="sophisticated-btn"
          >
            <FontAwesomeIcon icon={faInfoCircle} />
            How to stake
          </a>

          {stakedNFTsShdw.length > 0 ? (
            stakedNFTsShdw.map((nft, index) => (
              <Card
                key={index}
                className="stakedNFTCard m-2"
                style={{ width: "18rem" }}
              >
                <Tilt options={{ max: 25 }}>
                  <div className="imageContainer">
                    <Card.Img
                      variant="top"
                      src={nft.uri}
                      alt={`NFT ${nft.id}`}
                    />
                    <div className="rarityBadge">
                      {nft.rarityCategory === "Common" && (
                        <>
                          <FontAwesomeIcon icon={faStar} /> Common
                        </>
                      )}
                      {nft.rarityCategory === "Uncommon" && (
                        <>
                          <FontAwesomeIcon icon={faGem} /> Uncommon
                        </>
                      )}
                      {nft.rarityCategory === "Rare" && (
                        <>
                          <FontAwesomeIcon icon={faFire} /> Rare
                        </>
                      )}
                      {nft.rarityCategory === "Ultra Rare" && (
                        <>
                          <FontAwesomeIcon icon={faCrown} /> Ultra Rare
                        </>
                      )}
                    </div>
                    <div
                      className="Rcontainer"
                      style={{
                        position: "absolute",
                        top: "10px",
                        left: "10px",
                      }}
                    >
                      <p className="Rtext">BOSS #{nft.id}</p>
                    </div>
                    <div
                      className="Boss2-image"
                      style={{
                        position: "absolute",
                        bottom: "5px",
                        left: "5px",
                      }}
                    >
                      <img
                        src={Boss2}
                        alt="Boss2"
                        style={{ width: "30px", height: "30px" }}
                      />
                    </div>
                    <div
                      className="Rtext-value"
                      style={{
                        position: "absolute",
                        bottom: "10px",
                        right: "10px",
                      }}
                    >
                      {shdwVaultRewards[index] ? (
                        ethers.utils.formatEther(shdwVaultRewards[index])
                      ) : (
                        <Spinner animation="border" variant="info" />
                      )}
                    </div>
                  </div>
                </Tilt>

                <Card.Body>
                  <Button
                    variant="danger"
                    className="mr-2"
                    disabled={isLoadingBtn[nft.id]?.shdwUnstake}
                    onClick={() => unstakeFromShdwVaultHandler(nft.id)}
                  >
                    {isLoadingBtn[nft.id]?.shdwUnstake ? (
                      <>
                        Unstaking... <FontAwesomeIcon icon={faSpinner} spin />
                      </>
                    ) : (
                      <>
                        Unstake <FontAwesomeIcon icon={faArrowDown} />
                      </>
                    )}
                  </Button>
                  <Button
                    variant="success"
                    disabled={isLoadingBtn[nft.id]?.shdwClaim}
                    onClick={() => claimShdwVaultRewardsHandler(nft.id)}
                  >
                    {isLoadingBtn[nft.id]?.shdwClaim ? (
                      <>
                        Claiming... <FontAwesomeIcon icon={faSpinner} spin />
                      </>
                    ) : (
                      <>
                        Claim Rewards <FontAwesomeIcon icon={faCoins} />
                      </>
                    )}
                  </Button>
                  <Button
                    variant="danger"
                    className="exit-button mt-2"
                    disabled={isLoadingBtn[nft.id]?.shdwExit}
                    onClick={() =>
                      emergencyWithdrawFromShdwVaultHandler(nft.id)
                    }
                  >
                    {isLoadingBtn[nft.id]?.shdwExit ? (
                      <>
                        Exiting... <FontAwesomeIcon icon={faSpinner} spin />
                      </>
                    ) : (
                      <>
                        Exit <FontAwesomeIcon icon={faDoorOpen} />
                      </>
                    )}
                  </Button>
                </Card.Body>
              </Card>
            ))
          ) : (
            <div className="empty-state">
              <h3>You have no NFTs staked in the BOSS vault.</h3>
              <p>Stake your NFTs to earn Boss Token rewards!</p>
              <div className="btn-container">
                <a
                  href="https://www.externalsite.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button className="empty-btn">Buy NFT</button>
                </a>
                <Link to="/mint-page">
                  <button className="empty-btn">Mint NFT</button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default NFTStakingPage;
