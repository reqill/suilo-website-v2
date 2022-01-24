import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom';
import { ArrowRight } from 'react-feather';

const PrimaryPostCard = ({ postData }) => {
    const {
        id,
        title,
        textShort,//NEED TO BE SHORTENED JUST FOR PREVIEW TO NOT DOWNLOADING WHOLE ARTICLE
        date,
        photo,
        views //NEW
    } = postData;


    return (
        <div className="primary-post-card">
            <img src={photo} className="primary-post-image" />
            <h2 className="primary-post-header" title={title}>
                {title}
            </h2>
            <div className="primary-description-box">
                <h3 className="primary-post-description" title={textShort}>
                    {textShort}
                </h3>
                <div className="primary-post-btn-box">
                    <Link to={`post/${id}`} className="primary-post-btn" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                        <p>czytaj dalej</p>
                        <ArrowRight size={16} strokeWidth={"2.5px"} style={{ marginBottom: "-.1em", paddingLeft: ".5em" }} color="#FFA900" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default PrimaryPostCard;