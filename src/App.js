import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [formData, setFormData] = useState({ url: "", amount: 9 });
  const [finalData, setFinalData] = useState();
  const [Potential, setPotential] = useState();
  const [allContentData, setAllContentData] = useState([]);
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    setPotential();
    setFinalData();
    e?.preventDefault();
    console.log("checking");

    const url = new URL(formData?.url);

    const params = new URLSearchParams(url.search);

    const response = await fetch(
      `https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&id=${2}&key=AIzaSyC9BxSEvHEQQpqyEKfCShaRTi_yy22_B1g`,
      {
        method: "GET",
        headers: {112
          "Content-Type": "application/json",
        },
      }
    );

    const videoDetails = await response.json();

    const response2 = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics%2Csnippet&id=${videoDetails?.items[0]?.snippet?.channelId}&key=AIzaSyC9BxSEvHEQQpqyEKfCShaRTi_yy22_B1g`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const channelDetails = await response2.json();

    
    // get total duration of the channel
    let totalYears = getDateDiff(channelDetails?.items[0]?.snippet?.publishedAt)

    // Active subs = Total Subs * (1 - 0.1)^(total time to the channel)
    const activeSubs = parseInt(channelDetails?.items[0]?.statistics?.subscriberCount * Math.pow(0.9,totalYears))

    setFinalData({
      title: videoDetails?.items[0]?.snippet?.localized?.title,
      views: videoDetails?.items[0]?.statistics?.viewCount,
      likes: videoDetails?.items[0]?.statistics?.likeCount,
      comments: videoDetails?.items[0]?.statistics?.commentCount,
      channelId: videoDetails?.items[0]?.snippet?.channelId,
      channelName: videoDetails?.items[0]?.snippet?.channelTitle,
      subsCount: channelDetails?.items[0]?.statistics?.subscriberCount,
      activeSubs,
      totalChannelViews: channelDetails?.items[0]?.statistics?.viewCount,
      videoFreq: channelDetails?.items[0]?.statistics?.videoCount,
      channelpublishDate : channelDetails?.items[0]?.snippet?.publishedAt,
    });
  };

  const GetAllContentFromYoutube = async (
    pageToken = false,
    nextPageToken = ""
  ) => {
    const response = await fetch(
      `https://youtube.googleapis.com/youtube/v3/activities?part=contentDetails&channelId=${
        finalData?.channelId
      }&maxResults=10&key=AIzaSyC9BxSEvHEQQpqyEKfCShaRTi_yy22_B1g&${
        pageToken && `pageToken=${nextPageToken}`
      }`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    let allRecentVideoDetails = await response.json();

    setAllContentData(allContentData.push(...allRecentVideoDetails?.items));

    if (allRecentVideoDetails?.nextPageToken) {
      return GetAllContentFromYoutube(
        true,
        allRecentVideoDetails?.nextPageToken
      );
    }

    return true;
  };

  // finds the earning of each content found for a channel
  const traceEachVideo = async () => {
    const dataObj = [];

    for (let i = 0; i < allContentData.length; i++) {
      const element = allContentData[i];
      const videoId =
        element?.contentDetails?.upload?.videoId ||
        element?.contentDetails?.playlistItem?.resourceId?.videoId;

      const response = await fetch(
        `https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&id=${videoId}&key=AIzaSyC9BxSEvHEQQpqyEKfCShaRTi_yy22_B1g`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const DataVideo = await response.json();

      const matches =
        DataVideo?.items[0]?.contentDetails?.duration?.match(/PT(\d+)M(\d+)S/);

      // const minutes = parseInt(matches[1]);
      // const seconds = parseInt(matches[2]);

      // Convert minutes and seconds to seconds
      // const totalSeconds = minutes * 60 + seconds;

      if (matches) {
        dataObj.push({
          v,
          avgPotential: algorithmEarningPotential(
            DataVideo?.items[0]?.statistics?.viewCount,
            DataVideo?.items[0]?.statistics?.likeCount,
            DataVideo?.items[0]?.statistics?.commentCount
          ),
          videoData: DataVideo?.items[0],
        });

      }

    }

    return dataObj;
  };

  // Find the maximum value in a objects -------
  function sortAndRemoveDuplicates(array) {
    // Remove duplicates using Set
    const uniqueArray = Array.from(new Set(array.map(JSON.stringify))).map(
      JSON.parse
    );

    // Sort array in descending order based on avgPotential
    uniqueArray.sort((a, b) => b.avgPotential - a.avgPotential);

    return uniqueArray;
  }

  // FInds the main potential
  const handlePotential = async () => {
    setLoading(true)
    setAllContentData([]);
    console.log("rendering")
    
    // fetches all the video content of the user
    const data = await GetAllContentFromYoutube();
    console.log("rendering 1")
    
    let videoData = await traceEachVideo();
    console.log("rendering 2")

    const sortedAndUniqueData = sortAndRemoveDuplicates(videoData);
    setPotential(sortedAndUniqueData);

    setLoading(false)
  };

  // Get Date Diff ------
  function getDateDiff(date) {
    const currentDate = new Date();
    const specifiedDate = new Date(date);
  
    // Calculate the difference in milliseconds
    const diffInMs = currentDate - specifiedDate;
  
    // Convert milliseconds to days
    const diffInYears = diffInMs / (1000 * 60 * 60 * 24 * 365.25); // Account for leap years

  return Math.floor(diffInYears);
  }

  // Algorith of the earning potential
  const algorithmEarningPotential = (views, likes, comments) => {    
    const totalVisitors = Math.min(views,finalData?.activeSubs)
    let netVisitors = parseInt(comments) + parseInt(likes) * 0.5 + parseInt(totalVisitors) * 0.1

    const earning = netVisitors * 0.15 * formData?.amount;
    return earning
  };


  // Decode duration format from youtube video
  const decodeISO8601Duration = (duration) => {
    const regex = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;
    const matches = duration.match(regex);
  
    const years = matches[1] ? parseInt(matches[1]) : 0;
    const months = matches[2] ? parseInt(matches[2]) : 0;
    const weeks = matches[3] ? parseInt(matches[3]) : 0;
    const days = matches[4] ? parseInt(matches[4]) : 0;
    const hours = matches[5] ? parseInt(matches[5]) : 0;
    const minutes = matches[6] ? parseInt(matches[6]) : 0;
    const seconds = matches[7] ? parseInt(matches[7]) : 0;
  
    let result = "";
  
    if (years > 0) result += years + "Y";
    if (months > 0) result += months + "M";
    if (weeks > 0) result += weeks + "W";
    if (days > 0) result += days + "D";
  
    if (hours > 0 || minutes > 0 || seconds > 0) {
      //result += "T";
      if (hours > 0) result += hours + ":";
      if (minutes > 0) result += minutes + ":";
      if (seconds > 0) result += seconds ;
    }
  
    return result;
  }
  

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const loadScript = (url) =>{
    let script = document.createElement("script")
    script.src = url
    script.onload = (e) =>{
      console.log("script lOded succesfully",e)
    }
    script.onerror = (e) =>{
      console.log("some error occured",e)
    }
    script.onSuccess = (e) =>{
      console.log("success",e)
    }


    document.body.appendChild(script)
  }


  useEffect(() => {
    // Define the 'otpless' function
    window.otpless = (otplessUser) => {
     // Retrieve the user's details after successful login
     console.log(otplessUser)
     const waName = otplessUser.waName;
     const waNumber = otplessUser.waNumber;
         
     // Handle the signup/signin process
     console.log("Signing up process to be continued")
     // ...
    };
   }, []);
  

  return (
    <div className="basic_container">
      <button onClick={()=>loadScript("https://otpless.com/auth.js")}>Login using Otpless whatsapp</button>
      <h1>Youtube Earning Potential Calculator</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="url"
          name="url"
          required
          placeholder="Enter youtube video link"
          value={formData?.url}
          onChange={handleChange}
        />
        <input
          type="number"
          name="amount"
          required
          placeholder="Enter the amount you think for each user (otherwise use 9)"
          value={formData?.amount}
          onChange={handleChange}
        />

        <button type="submit">Submit</button>
      </form>

      {finalData && (
        <div>
          <h1>Channel Data</h1>
          <div>
            <p>Video Title : {finalData?.title}</p>
            <p>Video Views : {finalData?.views}</p>
            <p>Video Likes : {finalData?.likes}</p>
            <p>Video Comments : {finalData?.comments}</p>
            <p>Channel Name : {finalData?.channelName}</p>
            <p>Subscriber Count : {finalData?.subsCount}</p>
            <p>Active Subscriber Count : {finalData?.activeSubs}</p>
            <p>Total Views on Channel : {finalData?.totalChannelViews}</p>
            <p>Video Count : {finalData?.videoFreq}</p>
          </div>

          {!Potential && (
            <button onClick={handlePotential}>Check Earning Potential</button>
          )}

          <br />

          {loading && <h1>Loading....</h1>}

          {Potential?.map((e) => {
            return (
              <div key={e?.videoId}>
                <h1>{e?.videoData?.snippet?.localized?.title}</h1>
                <img
                  src={e?.videoData?.snippet?.thumbnails?.default?.url}
                  alt=""
                />
                <h3>Earning Potential - {e?.avgPotential.toFixed(2)}</h3>
                <p>Views:{e?.videoData?.statistics?.viewCount}</p>
                <p>Likes:{e?.videoData?.statistics?.likeCount}</p>
                <p>Comments:{e?.videoData?.statistics?.commentCount}</p>
                <p>Duration:{decodeISO8601Duration(e?.videoData?.contentDetails?.duration)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default App;
